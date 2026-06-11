# Supabase Migration Ledger

**Last verified against production: 2026-04-21**
**Verified by:** Direct query of `supabase_migrations.schema_migrations`, `information_schema.tables`, `information_schema.columns`, `pg_constraint`, `pg_indexes`, `pg_policies`, and `pg_proc`.
**Verification queries:** retained in this session's PRODUCTION_READINESS_AUDIT_REPORT.md and the conversation history.

Tracks the applied status of each file in `supabase/migrations/`. Source of truth is the `supabase_migrations.schema_migrations` table in production, supplemented by direct schema inspection for migrations that were applied manually outside the Supabase CLI. Update this ledger whenever a migration is applied.

## Verification

Run this query in the Supabase SQL Editor against the production database:

```sql
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

Compare the returned `version` values against the File column below. For each row in this ledger:

- If the timestamp prefix appears in the query output, mark Status as **applied (in supabase_migrations)**.
- If the migration's effects are observable in the live schema but the timestamp is absent from `schema_migrations`, mark Status as **applied (manual, not tracked)** and record the schema evidence in Notes.
- If neither the timestamp nor the migration's effects are present in production, mark Status as **not applied** and investigate whether application code depends on it.
- Files without a timestamp prefix (legacy SQL snapshots) will not appear in `schema_migrations`; mark them **applied (bootstrap)** after confirming their contents against the live schema.

## Status values

- `applied (in supabase_migrations)` — recorded in `supabase_migrations.schema_migrations`.
- `applied (manual, not tracked)` — effects present in production schema, but timestamp is absent from `supabase_migrations.schema_migrations`.
- `applied (bootstrap)` — original schema snapshot file; effects present in production tables.
- `not applied` — neither tracked nor observable in production schema.
- `uncertain — see notes` — partial or ambiguous evidence; resolution requires a follow-up query.
- `superseded` — replaced by a later migration; should not be applied.

## Ledger

| File | Status | Notes |
| --- | --- | --- |
| 20240114_security_hardening.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260123120000_clearinghouse_integration.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260123120001_subscription_system.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260125120000_cpt_checklists_audit_sessions.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260125120001_mfa_implementation.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260125120002_pending_profile_changes.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260125120003_user_invitations.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260127120000_billing_idempotency.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260127120001_fix_invitation_security.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260127120002_login_attempts.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260129_billing_core_infrastructure.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260203120000_performance_indexes.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260203120001_patient_extended_schema.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260210_add_review_statuses.applied.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21; self-identifies via `.applied.sql` suffix |
| 20260218_vitals_triage_tables.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260318120000_sprint1_security_remediations.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260318120001_sprint2_security_hardening.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260318120002_sprint3_billing_unique_constraint.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260319120000_billing_infrastructure.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260319120001_create_claim_lines.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260319120002_sprint4_security_remediations.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260319130000_sprint5_audit_policy_alignment.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260319131000_sprint5_session_timeout_and_profile_trigger.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260319132000_sprint5_acknowledgements_rls.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260320160000_sprint6_billing_claims_unique_encounter.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260320170000_sprint6_processed_webhook_events.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260320180000_sprint7_telehealth_session_tokens.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260320190000_sprint7_encounter_tracking_rls.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260320200000_sprint8_telehealth_token_single_use.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260320200001_sprint8_webhook_events_service_role_policies.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260322100000_sprint9_audit_logs_canonical_indexes.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260322120000_sprint11_telehealth_tokens_service_role_policies.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260327100000_pt2_patient_documents_delete_org_check.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260327110000_pt3_mfa_functions_remove_uuid_params.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260327120000_pt3_mfa_attempts_billing_claims_high_fixes.sql | applied (in supabase_migrations) | verified in supabase_migrations.schema_migrations on 2026-04-21 |
| 20260327130000_pt3_phi_update_with_check_medium_fixes.sql | uncertain — see notes | timestamp absent from supabase_migrations.schema_migrations on 2026-04-21; resolution requires querying `pg_policies` for UPDATE policies on PHI-bearing tables (patients, clinical_notes, encounters, billing_claims) and comparing the returned `with_check` clauses against this migration's expected set to determine which UPDATE policies are still missing a WITH CHECK clause |
| 20260327140000_pt4_telehealth_token_cleanup_function.sql | not applied | verified absent on 2026-04-21 — `SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_telehealth_tokens'` returned zero rows. Pilot impact: none for 5-day pilot; flag for Phase B |
| 20260327150000_pt5_billing_claims_null_encounter_unique.sql | not applied | verified absent on 2026-04-21 — `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_billing_claims_null_encounter_unique'` returned zero rows. Pilot impact: none for 5-day pilot; flag for Phase B |
| 20260327160000_pt6_storage_rls_org_scoped.sql | not applied | verified absent on 2026-04-21 — `SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'` returned zero rows; the old permissive policies were never replaced. Pilot impact: none for 5-day pilot; flag for Phase B |
| 20260407_fix_audit_logs_schema.sql | uncertain — see notes | timestamp absent from supabase_migrations.schema_migrations on 2026-04-21; resolution requires inspecting this file's body and comparing against the canonical 9-column audit_logs schema currently in production (`information_schema.columns WHERE table_name = 'audit_logs'`) — likely a no-op now, possibly superseded by 20260322100000_sprint9_audit_logs_canonical_indexes |
| 20260410120000_telehealth_invite_tokens.sql | applied (manual, not tracked) | timestamp absent from supabase_migrations.schema_migrations on 2026-04-21, but the `telehealth_invite_tokens` table exists in production per direct `information_schema.tables` query and prior session handoff notes confirm manual application |
| 20260411120000_audit_logs_archive.sql | not applied | verified absent on 2026-04-21 — `SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs_archive'` returned zero rows; `archive_old_audit_logs` function also absent from `pg_proc`. Pilot impact: none for 5-day pilot; flag for Phase B |
| 20260411120001_scalability_indexes.sql | uncertain — see notes | timestamp absent from supabase_migrations.schema_migrations on 2026-04-21; some audit_logs indexes are present per `pg_indexes`, but full coverage cannot be confirmed without enumerating this migration's expected index set against production `pg_indexes` rows for each target table |
| 20260417000000_accept_invitation_atomic.sql | uncertain — see notes | timestamp absent from supabase_migrations.schema_migrations on 2026-04-21; the `accept_invitation` function in production matches the secure post-fix_invitation_security version. May be superseded — resolution requires reading this migration's function body and comparing to `pg_get_functiondef` of the current `accept_invitation` definition |
| 20260419004357_add_encounters_duration_minutes.sql | applied (manual, not tracked) | timestamp absent from supabase_migrations.schema_migrations on 2026-04-21, but `encounters.duration_minutes` column exists per `information_schema.columns` query and prior session handoff history confirms manual application |
| 20260421000000_create_submissions_table.sql | applied (manual, not tracked) | timestamp absent from supabase_migrations.schema_migrations on 2026-04-21, but the `submissions` table exists with all expected FKs to `clinical_notes`, `patients`, `organizations`, and `users`, and the `status` CHECK constraint includes `pending_audit/pending_approval/approved/submitted/paid/rejected` per direct `pg_constraint` inspection |
| 20260423000000_inline_expiration_drop_orphan.sql | uncertain — see notes | timestamp absent from supabase_migrations.schema_migrations on 2026-04-21; resolution requires querying the `invitations` table to confirm whether the orphan column was dropped and the inline expiration column shape matches this migration's expected end state |
| 20260427042735_add_pilot_trial_columns.applied.sql | applied (manual, not tracked) | timestamp absent from supabase_migrations.schema_migrations on 2026-04-21, but pilot trial columns + CHECK constraint + index verified by James on 2026-04-21 via direct `information_schema.columns`, `pg_constraint`, and `pg_indexes` inspection; self-identifies via `.applied.sql` suffix |
| ehr_integration_tables.sql | applied (bootstrap) | original schema content; effects present in production tables |
| patient_documents.sql | applied (bootstrap) | original schema content; effects present in production tables |
| stage1_database_foundation.sql | applied (bootstrap) | original schema bootstrap; effects present in production tables |

## Pending application

The following migrations are confirmed not applied in production. None are required for the 5-day pilot but each must be reviewed and scheduled for Phase B before scaling, going billing-live, or expanding storage usage.

| File | Description | Risk if not applied | Recommended timing |
| --- | --- | --- | --- |
| 20260327140000_pt4_telehealth_token_cleanup_function.sql | SEC-PT4-F7: SECURITY DEFINER function `cleanup_expired_telehealth_tokens()` deletes used + >24h-expired rows from `telehealth_session_tokens`; called by `/api/cron/cleanup-telehealth-tokens`. | HIPAA data-minimization gap: encrypted PHI session tokens persist beyond operational need. Cron endpoint will fail or no-op until the function exists. | Phase B, before production telehealth traffic ramps |
| 20260327150000_pt5_billing_claims_null_encounter_unique.sql | SEC-PT5-F10: Partial unique index `idx_billing_claims_null_encounter_unique` on `(organization_id, patient_id, provider_id, service_date)` WHERE `encounter_id IS NULL`, complementing the existing not-null index. | Duplicate billing claims for the same patient/provider/service-date when no encounter is linked; potential payer rejections, double-billing exposure. | Phase B, before billing goes live |
| 20260327160000_pt6_storage_rls_org_scoped.sql | SEC-PT6-F1: Replaces permissive `storage.objects` policies on `patient-documents` bucket with org-scoped path-based policies (`{organization_id}/...` prefix) for SELECT, INSERT, and DELETE. | Cross-org PHI exposure: any authenticated user can currently read/write/delete documents across all organizations. HIPAA breach risk as soon as a second org joins. | Phase B, BEFORE onboarding any second organization |
| 20260411120000_audit_logs_archive.sql | Adds standalone `created_at` index on `audit_logs`, an `audit_logs_archive` mirror table, and `archive_old_audit_logs(cutoff_days)` SECURITY DEFINER function (EXECUTE revoked from PUBLIC) that atomically moves rows older than the cutoff via a single CTE DELETE...INSERT. | Unbounded `audit_logs` growth at ~1000 clinicians × ~250 events/day; query latency degradation and storage cost over time. Archive cron has nothing to call. | Phase B, before scale (>~100 active clinicians or >90 days of accumulated audit rows) |

| 20260526120000_create_write_audit_log_helper.sql | applied (manual, not tracked) | applied 2026-05-27 via `supabase db query --linked --file`; function verified via `pg_proc` (proname, prosecdef=true, owner=postgres, all 8 args present), comment present, search_path locked to ''. Smoke test row inserted via direct call: test_id `33133b14-4401-43bc-8134-9b7f877586b9` with correctly-merged JSONB details (source key preserved, risk_level injected). SEE 20260527120000 entry below for important post-apply finding re Supabase default privileges. |
| 20260527120000_fix_write_audit_log_default_privileges.sql | applied (manual, not tracked) | applied 2026-05-27 via `supabase db query --linked --file`. Fixup migration codifying ad-hoc REVOKE run within minutes of the original migration applying. Production verification on 2026-05-27 ~17:38 UTC found that `REVOKE ALL FROM PUBLIC` (in the original migration) was insufficient on Supabase: the new function inherited default EXECUTE grants for anon, authenticated, and service_role from pg_default_acl on the public schema. Ad-hoc `REVOKE EXECUTE ... FROM anon, authenticated, service_role` run immediately; audit_logs verified unpolluted during the ~2-3 minute exposure window. Re-verification confirms only postgres (owner) retains EXECUTE. |
| 20260602120000_entitlements_assessments_v1.sql | applied (manual, not tracked) | applied 2026-06-02 to eepwbtdqtdnqxeznykbh via `supabase db query --linked` (Management API; NOT a migration replay). Creates `features` + `user_features` matching schema.sql:458-577 — incl. the `feature_id`→`features(id)` FK the gate's `features!inner(code)` join needs, the 6 indexes, RLS enabled, and all 8 RLS policies (helpers `public.get_user_role`/`public.get_user_organization_id`, `auth.uid()`, role `authenticated` confirmed present pre-apply). Seeds ONLY the `ASSESSMENTS_V1` feature (PROFESSIONAL/CLINICAL) and grants it to jomanwa@gmail.com (id 170db033-5710-443a-903f-799b6d9ef1ca; enabled, no expiry). Post-apply verified: both tables present in information_schema, `relrowsecurity=true` on both, and the gate's exact query returns exactly one row for jomanwa under RLS (role `authenticated`). SUPERSEDES the stash-only `20260531200000_assessments_v1_feature.sql` (that file assumes the tables already exist — it does not create them — and dev-seed-grants the feature to ALL users via `CROSS JOIN users`; it was intentionally NOT applied and NOT committed, and remains only in stash@{0}). |
| 20260610230000_sidecar_rls_patient_access.sql | applied (manual, not tracked) | applied manually to prod 2026-06-09 (policies `sidecar_self_user` on public.users + `sidecar_org_patients` on public.patients, SELECT-only for role `sidecar_assessments`); file is record-only for rebuild/history — do NOT replay. |
| 20260611120000_patient_portal_foundation.sql | not applied | DRAFT — NOT YET APPLIED. PRD-02 P0 foundation: `patient_portal_users` + `patient_portal_invites` tables, `patient_portal` role (NOINHERIT LOGIN; substitute password from vault at apply time), clinician org-scoped policies TO authenticated, patient-scoped SELECT policies TO patient_portal on patients/assessment_assignments/assessment_administrations/assessment_results. GATED MANUAL APPLY only (`supabase db query --linked --file`); do NOT `db push`/replay blindly. After applying: verify policies via `pg_policies`, role via `pg_roles`, and update this row. The `/api/portal-invites` routes are additionally gated behind the `PORTAL_V1` feature (unseeded → fail-closed 403), so OG is safe to deploy before this migration is applied; seed `PORTAL_V1` in `features` + grant via `user_features` (mirroring the 20260602120000 ASSESSMENTS_V1 pattern) as part of the portal rollout. |

## Lessons learned

### Supabase default function privileges (2026-05-27)

Functions created in the `public` schema on Supabase inherit default EXECUTE grants for the `anon`, `authenticated`, and `service_role` roles via `pg_default_acl`. These default grants are SEPARATE from the `PUBLIC` virtual role and are NOT removed by `REVOKE ALL ON FUNCTION ... FROM PUBLIC`.

Discovered while applying `20260526120000_create_write_audit_log_helper.sql`. The original migration contained `REVOKE ALL FROM PUBLIC` as its lockdown step but this proved insufficient: post-apply, `information_schema.routine_privileges` showed `anon | EXECUTE`, `authenticated | EXECUTE`, `service_role | EXECUTE`, and `postgres | EXECUTE`. Audit log was verified unpolluted during the brief exposure window.

**Mandatory pattern for future SECURITY DEFINER (and SECURITY INVOKER) functions in `public`:**

```sql
REVOKE EXECUTE ON FUNCTION public.<fn_name>(<arg_types>)
    FROM anon, authenticated, service_role;
```

Use this REVOKE in addition to (or instead of) `REVOKE FROM PUBLIC`. The owner (typically `postgres`) retains EXECUTE inherently. The REVOKE does not affect the owner.

**Verification query (run after applying any new SECURITY DEFINER function):**

```sql
SELECT grantee, privilege_type FROM information_schema.routine_privileges
WHERE routine_name = '<fn_name>';
```

Expect: exactly one row with `grantee = postgres`. Any row showing `anon`, `authenticated`, or `service_role` indicates the default grants slipped through and must be REVOKEd before any production traffic.

### Migration file encoding (2026-05-27)

PowerShell 5.x has two encoding pitfalls when authoring SQL migration files:

1. `Set-Content -Encoding UTF8` emits a UTF-8 BOM (3-byte prefix EF BB BF). The Supabase CLI rejects SQL files with a BOM (`syntax error at or near` followed by the BOM glyph). Fix: write via `[System.IO.File]::WriteAllText(path, content, [System.Text.UTF8Encoding]::new($false))`.

2. `Get-Content -Raw` reads files using the system code page (Windows-1252 on most US Windows installs), not UTF-8. Multi-byte UTF-8 characters (em-dashes, smart quotes, etc.) get mangled into Latin-1 sequences. Fix: read via `[System.IO.File]::ReadAllText(path, [System.Text.Encoding]::UTF8)`, OR avoid reading entirely and use `[System.IO.File]::AppendAllText` to append.

Verify file bytes after writing: `[System.IO.File]::ReadAllBytes(path) | Select-Object -First 5 | ForEach-Object { "{0:X2}" -f $_ }`. SQL files should start with the SQL content bytes (e.g., `2D 2D` for `--`), not `EF BB BF` (BOM) or anything else.