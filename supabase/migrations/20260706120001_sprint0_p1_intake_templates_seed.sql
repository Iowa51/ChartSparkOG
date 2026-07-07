-- ============================================================
-- Sprint 0 / Phase 1 -- Seed intake_templates (both templates)
-- Plan: planning/INTAKE-ERX-PROJECT-PLAN.md v1.1 (criteria S2 / R7)
--
-- Two system templates (organization_id NULL, created_by NULL):
--   (a) family_medicine -- comprehensive intake, active
--   (b) _smoke_test      -- 3 arbitrary sections, inactive; proves the
--                            engine carries no hard-coded family-medicine
--                            logic (a second specialty renders from data alone)
--
-- The definition JSON follows the template-engine contract:
--   { "sections": [ { "key", "label", "conditional"?,
--       "fields": [ { "key", "type", "label", "code_binding", "required",
--                     "options" } ] } ] }
--
-- Idempotent: ON CONFLICT (specialty, name, version) DO NOTHING.
-- ============================================================

INSERT INTO public.intake_templates (organization_id, specialty, name, version, active, definition)
VALUES (
  NULL,
  'family_medicine',
  'Family Medicine Comprehensive Intake',
  1,
  TRUE,
  '{
    "sections": [
      {
        "key": "demographics",
        "label": "Demographics & Preferred Pharmacy",
        "fields": [
          { "key": "legal_name", "type": "text", "label": "Legal Name", "required": true },
          { "key": "preferred_name", "type": "text", "label": "Preferred Name", "required": false },
          { "key": "date_of_birth", "type": "date", "label": "Date of Birth", "required": true },
          { "key": "sex", "type": "select", "label": "Sex Assigned at Birth", "required": true, "options": ["female", "male", "intersex"] },
          { "key": "gender_identity", "type": "text", "label": "Gender Identity", "required": false },
          { "key": "preferred_pharmacy", "type": "text", "label": "Preferred Pharmacy (name + address)", "required": false }
        ]
      },
      {
        "key": "chief_complaint",
        "label": "Chief Complaint",
        "fields": [
          { "key": "chief_complaint", "type": "textarea", "label": "What brings you in today?", "required": true }
        ]
      },
      {
        "key": "hpi",
        "label": "History of Present Illness (OLDCARTS)",
        "fields": [
          { "key": "onset", "type": "text", "label": "Onset", "required": false },
          { "key": "location", "type": "text", "label": "Location", "required": false },
          { "key": "duration", "type": "text", "label": "Duration", "required": false },
          { "key": "character", "type": "text", "label": "Character", "required": false },
          { "key": "aggravating", "type": "text", "label": "Aggravating Factors", "required": false },
          { "key": "relieving", "type": "text", "label": "Relieving Factors", "required": false },
          { "key": "timing", "type": "text", "label": "Timing", "required": false },
          { "key": "severity", "type": "number", "label": "Severity (0-10)", "required": false }
        ]
      },
      {
        "key": "pmh",
        "label": "Past Medical History",
        "fields": [
          { "key": "problems", "type": "group", "label": "Known Conditions", "code_binding": "icd10", "required": false }
        ]
      },
      {
        "key": "psh",
        "label": "Past Surgical History",
        "fields": [
          { "key": "surgeries", "type": "group", "label": "Prior Surgeries", "code_binding": "snomed", "required": false }
        ]
      },
      {
        "key": "medications",
        "label": "Medications",
        "fields": [
          { "key": "medications", "type": "group", "label": "Current Medications", "code_binding": "rxnorm", "required": false }
        ]
      },
      {
        "key": "allergies",
        "label": "Allergies",
        "fields": [
          { "key": "nkda", "type": "boolean", "label": "No Known Drug Allergies", "required": false },
          { "key": "allergies", "type": "group", "label": "Allergies", "code_binding": "rxnorm", "required": false }
        ]
      },
      {
        "key": "family_history",
        "label": "Family History",
        "fields": [
          { "key": "family_history", "type": "group", "label": "Family Conditions", "code_binding": "snomed", "required": false }
        ]
      },
      {
        "key": "social_history",
        "label": "Social History",
        "fields": [
          { "key": "tobacco_status", "type": "select", "label": "Tobacco Use", "required": false, "options": ["never", "former", "current"] },
          { "key": "pack_years", "type": "number", "label": "Pack Years", "required": false },
          { "key": "alcohol_audit_c", "type": "number", "label": "AUDIT-C Score", "required": false },
          { "key": "occupation", "type": "text", "label": "Occupation", "required": false },
          { "key": "living_situation", "type": "text", "label": "Living Situation", "required": false }
        ]
      },
      {
        "key": "ros",
        "label": "Review of Systems (14-system)",
        "fields": [
          { "key": "constitutional", "type": "select", "label": "Constitutional", "required": false, "options": ["positive", "negative"] },
          { "key": "eyes", "type": "select", "label": "Eyes", "required": false, "options": ["positive", "negative"] },
          { "key": "ent", "type": "select", "label": "ENT", "required": false, "options": ["positive", "negative"] },
          { "key": "cardiovascular", "type": "select", "label": "Cardiovascular", "required": false, "options": ["positive", "negative"] },
          { "key": "respiratory", "type": "select", "label": "Respiratory", "required": false, "options": ["positive", "negative"] },
          { "key": "gi", "type": "select", "label": "Gastrointestinal", "required": false, "options": ["positive", "negative"] },
          { "key": "gu", "type": "select", "label": "Genitourinary", "required": false, "options": ["positive", "negative"] },
          { "key": "musculoskeletal", "type": "select", "label": "Musculoskeletal", "required": false, "options": ["positive", "negative"] },
          { "key": "integumentary", "type": "select", "label": "Integumentary", "required": false, "options": ["positive", "negative"] },
          { "key": "neurological", "type": "select", "label": "Neurological", "required": false, "options": ["positive", "negative"] },
          { "key": "psychiatric", "type": "select", "label": "Psychiatric", "required": false, "options": ["positive", "negative"] },
          { "key": "endocrine", "type": "select", "label": "Endocrine", "required": false, "options": ["positive", "negative"] },
          { "key": "heme_lymphatic", "type": "select", "label": "Heme / Lymphatic", "required": false, "options": ["positive", "negative"] },
          { "key": "allergic_immunologic", "type": "select", "label": "Allergic / Immunologic", "required": false, "options": ["positive", "negative"] }
        ]
      },
      {
        "key": "immunizations",
        "label": "Immunizations",
        "fields": [
          { "key": "immunizations", "type": "group", "label": "Immunization Record", "code_binding": "cvx", "required": false }
        ]
      },
      {
        "key": "health_maintenance",
        "label": "Health Maintenance / Screening",
        "fields": [
          { "key": "last_physical", "type": "date", "label": "Last Physical Exam", "required": false },
          { "key": "screenings_due", "type": "textarea", "label": "Screenings Due", "required": false }
        ]
      },
      {
        "key": "obgyn",
        "label": "OB/GYN History",
        "conditional": { "field": "demographics.sex", "equals": "female" },
        "fields": [
          { "key": "lmp", "type": "date", "label": "Last Menstrual Period", "required": false },
          { "key": "gravida", "type": "number", "label": "Gravida", "required": false },
          { "key": "para", "type": "number", "label": "Para", "required": false },
          { "key": "last_pap", "type": "date", "label": "Last Pap Smear", "required": false }
        ]
      },
      {
        "key": "vitals",
        "label": "Vitals",
        "fields": [
          { "key": "height", "type": "number", "label": "Height (in)", "required": false },
          { "key": "weight", "type": "number", "label": "Weight (lb)", "required": false },
          { "key": "systolic", "type": "number", "label": "Systolic BP", "required": false },
          { "key": "diastolic", "type": "number", "label": "Diastolic BP", "required": false },
          { "key": "hr", "type": "number", "label": "Heart Rate", "required": false },
          { "key": "temp", "type": "number", "label": "Temperature (F)", "required": false }
        ]
      },
      {
        "key": "advance_directives",
        "label": "Advance Directives",
        "fields": [
          { "key": "has_advance_directive", "type": "boolean", "label": "Do you have an advance directive?", "required": false },
          { "key": "healthcare_proxy", "type": "text", "label": "Healthcare Proxy", "required": false }
        ]
      },
      {
        "key": "consents",
        "label": "Consents",
        "fields": [
          { "key": "consent_to_treat", "type": "boolean", "label": "Consent to Treat", "required": true },
          { "key": "hipaa_acknowledged", "type": "boolean", "label": "HIPAA Notice Acknowledged", "required": true }
        ]
      }
    ]
  }'::jsonb
)
ON CONFLICT (specialty, name, version) DO NOTHING;

-- Second specialty smoke test: inactive, 3 arbitrary sections, no
-- family-medicine fields. Proves the engine is data-driven (criterion S2/R7).
INSERT INTO public.intake_templates (organization_id, specialty, name, version, active, definition)
VALUES (
  NULL,
  '_smoke_test',
  'Second Specialty Smoke Test',
  1,
  FALSE,
  '{
    "sections": [
      {
        "key": "alpha",
        "label": "Alpha Section",
        "fields": [
          { "key": "field_one", "type": "text", "label": "Field One", "required": false },
          { "key": "field_two", "type": "boolean", "label": "Field Two", "required": false }
        ]
      },
      {
        "key": "bravo",
        "label": "Bravo Section",
        "fields": [
          { "key": "pick", "type": "select", "label": "Pick One", "required": false, "options": ["x", "y", "z"] }
        ]
      },
      {
        "key": "charlie",
        "label": "Charlie Section",
        "fields": [
          { "key": "notes", "type": "textarea", "label": "Freeform Notes", "required": false }
        ]
      }
    ]
  }'::jsonb
)
ON CONFLICT (specialty, name, version) DO NOTHING;
