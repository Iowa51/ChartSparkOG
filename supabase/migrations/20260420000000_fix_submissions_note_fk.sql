-- Fix submissions.note_id FK to reference clinical_notes instead of orphaned notes table
-- Context: the `notes` table has 0 rows and no writers; every clinical note in the
-- app is stored in `clinical_notes`. The auditor workflow reads submissions.note_id
-- and must be able to join to the real notes table.
-- Safe to apply: submissions has 0 rows at time of migration.

ALTER TABLE submissions
    DROP CONSTRAINT IF EXISTS submissions_note_id_fkey;

ALTER TABLE submissions
    ADD CONSTRAINT submissions_note_id_fkey
    FOREIGN KEY (note_id) REFERENCES clinical_notes(id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT submissions_note_id_fkey ON submissions IS
    'References clinical_notes (the active notes table). Previously referenced the orphaned notes table — corrected 2026-04-20.';
