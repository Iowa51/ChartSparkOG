# Supabase Migration Ledger

Tracks the applied status of each file in `supabase/migrations/`. Source of truth is the `supabase_migrations.schema_migrations` table in production. Update this ledger whenever a migration is applied.

## Verification

Run this query in the Supabase SQL Editor against the production database:

```sql
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

Compare the returned `version` values against the File column below. For each row in this ledger:

- If the timestamp prefix appears in the query output, mark Status as **applied**.
- If it does not appear, mark Status as **not applied** and investigate whether application code depends on it.
- Files without a timestamp prefix (legacy SQL snapshots) will not appear in `schema_migrations`; confirm their contents by inspecting the live schema directly.

## Ledger

| File | Status | Notes |
| --- | --- | --- |
| 20240114_security_hardening.sql | unknown | |
| 20260123120000_clearinghouse_integration.sql | unknown | |
| 20260123120001_subscription_system.sql | unknown | |
| 20260125120000_cpt_checklists_audit_sessions.sql | unknown | |
| 20260125120001_mfa_implementation.sql | unknown | |
| 20260125120002_pending_profile_changes.sql | unknown | |
| 20260125120003_user_invitations.sql | unknown | |
| 20260127120000_billing_idempotency.sql | unknown | |
| 20260127120001_fix_invitation_security.sql | unknown | |
| 20260127120002_login_attempts.sql | unknown | |
| 20260129_billing_core_infrastructure.sql | unknown | |
| 20260203120000_performance_indexes.sql | unknown | |
| 20260203120001_patient_extended_schema.sql | unknown | |
| 20260210_add_review_statuses.applied.sql | confirmed applied | Self-identifies via `.applied.sql` suffix |
| 20260218_vitals_triage_tables.sql | unknown | |
| 20260318120000_sprint1_security_remediations.sql | unknown | |
| 20260318120001_sprint2_security_hardening.sql | unknown | |
| 20260318120002_sprint3_billing_unique_constraint.sql | unknown | |
| 20260319120000_billing_infrastructure.sql | unknown | |
| 20260319120001_create_claim_lines.sql | unknown | |
| 20260319120002_sprint4_security_remediations.sql | unknown | |
| 20260319130000_sprint5_audit_policy_alignment.sql | unknown | |
| 20260319131000_sprint5_session_timeout_and_profile_trigger.sql | unknown | |
| 20260319132000_sprint5_acknowledgements_rls.sql | unknown | |
| 20260320160000_sprint6_billing_claims_unique_encounter.sql | unknown | |
| 20260320170000_sprint6_processed_webhook_events.sql | unknown | |
| 20260320180000_sprint7_telehealth_session_tokens.sql | unknown | |
| 20260320190000_sprint7_encounter_tracking_rls.sql | unknown | |
| 20260320200000_sprint8_telehealth_token_single_use.sql | unknown | |
| 20260320200001_sprint8_webhook_events_service_role_policies.sql | unknown | |
| 20260322100000_sprint9_audit_logs_canonical_indexes.sql | unknown | |
| 20260322120000_sprint11_telehealth_tokens_service_role_policies.sql | unknown | |
| 20260327100000_pt2_patient_documents_delete_org_check.sql | unknown | |
| 20260327110000_pt3_mfa_functions_remove_uuid_params.sql | unknown | |
| 20260327120000_pt3_mfa_attempts_billing_claims_high_fixes.sql | unknown | |
| 20260327130000_pt3_phi_update_with_check_medium_fixes.sql | unknown | |
| 20260327140000_pt4_telehealth_token_cleanup_function.sql | unknown | |
| 20260327150000_pt5_billing_claims_null_encounter_unique.sql | unknown | |
| 20260327160000_pt6_storage_rls_org_scoped.sql | unknown | |
| 20260407_fix_audit_logs_schema.sql | unknown | |
| 20260410120000_telehealth_invite_tokens.sql | unknown | |
| 20260411120000_audit_logs_archive.sql | unknown | |
| 20260411120001_scalability_indexes.sql | unknown | |
| 20260417000000_accept_invitation_atomic.sql | unknown | |
| 20260419004357_add_encounters_duration_minutes.sql | unknown | |
| 20260421000000_create_submissions_table.sql | unknown | |
| 20260423000000_inline_expiration_drop_orphan.sql | confirmed applied | Applied in Session 7 |
| ehr_integration_tables.sql | unknown | No timestamp prefix; will not appear in `schema_migrations`. Verify by inspecting live schema. |
| patient_documents.sql | unknown | No timestamp prefix; will not appear in `schema_migrations`. Verify by inspecting live schema. |
| stage1_database_foundation.sql | unknown | No timestamp prefix; will not appear in `schema_migrations`. Verify by inspecting live schema. |
