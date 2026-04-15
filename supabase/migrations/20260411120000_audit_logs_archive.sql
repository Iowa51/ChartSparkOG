-- ============================================================================
-- Audit log retention & archive
-- ============================================================================
-- Adds:
--   1. A standalone (non-composite) created_at index on audit_logs. The
--      existing idx_audit_logs_org_created_at is (organization_id, created_at)
--      which does NOT help a cross-org range scan on created_at alone — which
--      is exactly what the archive job issues.
--   2. An audit_logs_archive table mirroring audit_logs.
--   3. A SECURITY DEFINER function archive_old_audit_logs(cutoff_days) that
--      atomically moves rows older than cutoff_days from audit_logs into
--      audit_logs_archive in a single CTE DELETE...INSERT.
--
-- The function is locked down: EXECUTE is revoked from PUBLIC so only a
-- service-role client (or a superuser running a cron) can invoke it.
--
-- ----------------------------------------------------------------------------
-- Storage growth estimate
-- ----------------------------------------------------------------------------
-- Assumptions:
--   - 1000 daily-active clinicians
--   - ~250 auditable events / clinician / day
--     (logins, patient views, note CRUD, audit views, chart summaries, etc.)
--   - Average row size ~800 bytes (table data + indexes + JSONB `details`)
--
-- Daily write volume:      1000 × 250 × 800 B  ≈   200 MB / day
-- 90-day hot table:        ~18 GB raw + ~25% index overhead ≈ 22 GB
-- Annual archive growth:   ~73 GB / year
--
-- If the details JSONB averages closer to ~100 B instead of ~500 B the numbers
-- drop to ~125 MB/day, ~14 GB hot, ~45 GB/year. Operators should re-measure
-- after the first 30 days in production and tune the cutoff if needed.
-- ============================================================================

BEGIN;

-- 1. Standalone created_at index for cross-org archive scans
--    The existing composite (organization_id, created_at) leads on org_id so
--    a pure `WHERE created_at < $1` predicate cannot use it efficiently.
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON public.audit_logs (created_at);

-- 2. Archive table — mirror the source's column shape and defaults.
--    INCLUDING CONSTRAINTS carries over NOT NULL and CHECK constraints.
--    We deliberately do NOT copy indexes (INCLUDING INDEXES) — the archive
--    table is rarely queried and extra indexes would waste write IO during
--    the insert step of archive_old_audit_logs.
CREATE TABLE IF NOT EXISTS public.audit_logs_archive (
    LIKE public.audit_logs
    INCLUDING DEFAULTS
    INCLUDING CONSTRAINTS
);

-- Always index archived_at so ad-hoc retention queries over the archive can
-- use a b-tree scan instead of a seq scan.
CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_created_at
    ON public.audit_logs_archive (created_at);

-- 3. RLS: lock the archive table down to service-role access only. Any
--    application-level read must go through a server-side handler that has
--    already checked the caller's role. This matches the "archived audit
--    logs are forensic" intent — regular clients never need direct access.
ALTER TABLE public.audit_logs_archive ENABLE ROW LEVEL SECURITY;

-- Explicit no-op policy for clarity: nothing matches unless a service-role
-- key bypasses RLS (which it does by design).
DROP POLICY IF EXISTS audit_logs_archive_service_role_only ON public.audit_logs_archive;
CREATE POLICY audit_logs_archive_service_role_only
    ON public.audit_logs_archive
    FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);

-- 4. Archive function
--    Atomically moves rows older than `cutoff_days` into the archive table.
--    Returns (archived_count, cutoff_date) so callers can log the outcome.
CREATE OR REPLACE FUNCTION public.archive_old_audit_logs(cutoff_days INTEGER DEFAULT 90)
RETURNS TABLE(archived_count BIGINT, cutoff_date TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
    v_count  BIGINT;
BEGIN
    IF cutoff_days IS NULL OR cutoff_days < 1 THEN
        RAISE EXCEPTION 'cutoff_days must be a positive integer, got %', cutoff_days;
    END IF;

    v_cutoff := NOW() - MAKE_INTERVAL(days => cutoff_days);

    -- CTE pattern: DELETE...RETURNING feeds an INSERT in a single statement
    -- so rows cannot be lost between steps if the transaction fails partway.
    WITH moved AS (
        DELETE FROM public.audit_logs
        WHERE created_at < v_cutoff
        RETURNING *
    )
    INSERT INTO public.audit_logs_archive
    SELECT * FROM moved;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN QUERY SELECT v_count, v_cutoff;
END;
$$;

-- Function is privileged — only callers with explicit access may run it.
REVOKE EXECUTE ON FUNCTION public.archive_old_audit_logs(INTEGER) FROM PUBLIC;
-- Service role (which bypasses GRANT checks on SECURITY DEFINER functions
-- via superuser-level access) can always invoke this.

COMMIT;
