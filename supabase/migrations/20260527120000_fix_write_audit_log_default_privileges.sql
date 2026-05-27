-- Migration: explicit REVOKE of Supabase default function privileges
-- on public.write_audit_log.
--
-- The original migration (20260526120000_create_write_audit_log_helper.sql)
-- contained `REVOKE ALL ON FUNCTION ... FROM PUBLIC` as the lockdown step.
-- On Supabase this is INSUFFICIENT: functions created in the public schema
-- inherit default EXECUTE grants for the anon, authenticated, and
-- service_role Supabase roles (configured via pg_default_acl, separate
-- from the PUBLIC virtual role). REVOKE FROM PUBLIC does not remove these
-- default grants.
--
-- Production verification on 2026-05-27 (UTC) within minutes of the
-- original migration applying showed all three Supabase default roles
-- had EXECUTE on the function:
--   service_role  | EXECUTE
--   authenticated | EXECUTE
--   anon          | EXECUTE
--   postgres      | EXECUTE
--
-- The audit_logs table was verified unpolluted during the brief exposure
-- window. An ad-hoc REVOKE was run immediately to close the gap. This
-- migration codifies the REVOKE so the original migration source +
-- this migration together produce a correct end-state on any future
-- replay (e.g., staging clone, fresh dev environment, pentest replica).
--
-- Pattern lesson: on Supabase, new SECURITY DEFINER (and SECURITY INVOKER)
-- functions in the public schema MUST explicitly REVOKE EXECUTE from
-- anon, authenticated, and service_role in addition to (or instead of)
-- REVOKE FROM PUBLIC. The owner (postgres in this case) retains EXECUTE
-- inherently and is not affected by this REVOKE.

REVOKE EXECUTE ON FUNCTION public.write_audit_log(
    text, text, uuid, uuid, uuid, text, jsonb, text
) FROM anon, authenticated, service_role;