-- ============================================================
-- INLINE EXPIRATION LOGIC + DROP ORPHANED FUNCTION
-- ============================================================
-- Why:
--   expire_old_invitations() became an orphaned helper after its body was
--   inlined directly into check_expired_invitations(). It had no other
--   callers, and keeping the standalone function around invited drift
--   between the repo and what actually runs in production.
--
-- When:
--   Originally applied via the Supabase dashboard on 2026-04-17. No
--   migration file was created at the time, so the repo drifted from
--   production. This migration version-controls that change.
--
-- What:
--   1. CREATE OR REPLACE check_expired_invitations() with the expiration
--      SQL inlined (no PERFORM of the helper).
--   2. DROP FUNCTION IF EXISTS expire_old_invitations().
--
-- Idempotent: safe to re-apply against a database that already received
-- the dashboard change.
-- ============================================================

-- Part A: Inline the expiration logic into check_expired_invitations()
CREATE OR REPLACE FUNCTION public.check_expired_invitations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Mark expired invitations (inlined from former expire_old_invitations())
    UPDATE public.invitations
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();

    RETURN NEW;
END;
$$;

-- Part B: Drop the orphaned standalone function
DROP FUNCTION IF EXISTS public.expire_old_invitations();
