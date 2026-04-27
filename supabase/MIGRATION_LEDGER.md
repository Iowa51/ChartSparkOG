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
