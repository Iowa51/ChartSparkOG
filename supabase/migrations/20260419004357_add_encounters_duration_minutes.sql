-- Add duration_minutes to encounters table
--
-- Context: production schema drifted from supabase/schema.sql, which has
-- always defined this column. The application code (Zod schemas, data
-- layer INSERT in src/lib/data/encounters.ts, and the Encounter type)
-- already expects this column. Without it, POST /api/encounters fails
-- with: "Could not find the 'duration_minutes' column of 'encounters'
-- in the schema cache".
--
-- Purpose: stores the duration of a clinical encounter in minutes
-- (e.g. 15 for med management, 60 for initial evaluation). Nullable
-- because the value is typically captured at encounter completion,
-- not at creation.

ALTER TABLE public.encounters
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NULL;

COMMENT ON COLUMN public.encounters.duration_minutes IS
  'Duration of the clinical encounter in minutes (1-480). Captured at encounter completion; null while in progress.';
