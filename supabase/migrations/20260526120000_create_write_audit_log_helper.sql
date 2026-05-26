-- Migration: create public.write_audit_log SECURITY DEFINER helper.
--
-- Why this exists: ChartSparkOG's audit_logs INSERT policy was hardened
-- in Sprint 5 to restrict writes to {service_role} only. Sidecars in
-- the parity plan (chartspark-assessments, chartspark-portal, chartspark-
-- claims, chartspark-content, chartspark-scribe) use dedicated Postgres
-- roles that are NOT members of service_role. Without this helper, no
-- sidecar can write audit log entries -- breaking HIPAA audit trail
-- compliance.
--
-- Security model:
--   - PUBLIC has no EXECUTE (REVOKE below)
--   - Each sidecar's own migration GRANT EXECUTEs to its specific
--     dedicated role; no implicit access
--   - Function only writes; no SELECT path through this function
--   - No dynamic SQL; parameterized INSERT only
--   - search_path locked to empty string; all refs schema-qualified
--     (public.* for our objects, pg_catalog.* for built-ins) to
--     prevent shadowing attacks
--
-- Conventions inherited from public.accept_invitation_atomic:
--   - p_ prefix for arguments
--   - jsonb_build_object for details merging
--   - EXCEPTION WHEN OTHERS with SQLERRM-wrapped raise
--   - action stored as uppercase snake-case

CREATE OR REPLACE FUNCTION public.write_audit_log(
    p_action          text,
    p_entity_type     text,
    p_user_id         uuid    DEFAULT NULL,
    p_organization_id uuid    DEFAULT NULL,
    p_entity_id       uuid    DEFAULT NULL,
    p_ip_address      text    DEFAULT NULL,
    p_details         jsonb   DEFAULT NULL,
    p_risk_level      text    DEFAULT 'INFO'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
DECLARE
    v_id uuid;
    v_details jsonb;
BEGIN
    -- Enforce NOT NULL on required arguments. Match audit_logs schema.
    IF p_action IS NULL OR p_action = '' THEN
        RAISE EXCEPTION 'write_audit_log: p_action is required and must be non-empty';
    END IF;
    IF p_entity_type IS NULL OR p_entity_type = '' THEN
        RAISE EXCEPTION 'write_audit_log: p_entity_type is required and must be non-empty';
    END IF;

    -- Merge risk_level into details JSONB for uniform column shape.
    -- With search_path = '', built-ins must be qualified to pg_catalog.
    v_details := COALESCE(p_details, '{}'::jsonb)
                 || pg_catalog.jsonb_build_object('risk_level', pg_catalog.upper(p_risk_level));

    INSERT INTO public.audit_logs (
        action,
        user_id,
        organization_id,
        entity_type,
        entity_id,
        ip_address,
        details
    ) VALUES (
        p_action,
        p_user_id,
        p_organization_id,
        p_entity_type,
        p_entity_id,
        p_ip_address,
        v_details
    )
    RETURNING id INTO v_id;

    RETURN v_id;

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'write_audit_log failed: %', SQLERRM;
END;
$func$;

-- Lock down: PUBLIC cannot execute. Each sidecar's own migration
-- explicitly GRANT EXECUTEs to its dedicated Postgres role.
REVOKE ALL ON FUNCTION public.write_audit_log(text, text, uuid, uuid, uuid, text, jsonb, text) FROM PUBLIC;

-- Comment for discoverability and re-pentest review
COMMENT ON FUNCTION public.write_audit_log(text, text, uuid, uuid, uuid, text, jsonb, text) IS
  'Audit-write chokepoint for sidecars. SECURITY DEFINER bypass of audit_logs RLS is intentional per threat model in migration source. Sidecars must GRANT EXECUTE to their dedicated Postgres role in their own migration. See chartspark-prd/features/01-rating-scales.md and chartspark-prd/skills/sidecar-scaffolding.md for usage. Write-only path; no SELECT capability through this function.';
