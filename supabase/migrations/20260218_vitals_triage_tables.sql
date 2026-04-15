-- =============================================
-- VITALS & SMART TRIAGE MIGRATION
-- Created: 2026-02-18
-- Description: Adds vitals tracking, behavioral health screenings,
--              AI smart triage, and medication interaction logging
-- Self-contained: no dependency on helper functions or public.users
-- =============================================

-- =============================================
-- VITALS TABLE
-- Standard + behavioral health vitals per encounter
-- =============================================
CREATE TABLE IF NOT EXISTS vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  encounter_id UUID,
  recorded_by UUID NOT NULL,

  -- Standard Vitals
  bp_systolic INTEGER,           -- mmHg
  bp_diastolic INTEGER,          -- mmHg
  heart_rate INTEGER,            -- bpm
  temperature DECIMAL(5,1),      -- stored in °F
  temperature_unit VARCHAR(1) DEFAULT 'F' CHECK (temperature_unit IN ('F', 'C')),
  respiratory_rate INTEGER,      -- breaths/min
  spo2 DECIMAL(4,1),            -- oxygen saturation %
  weight DECIMAL(6,1),           -- stored in lbs
  weight_unit VARCHAR(3) DEFAULT 'lbs' CHECK (weight_unit IN ('lbs', 'kg')),
  height DECIMAL(5,1),           -- stored in inches
  height_unit VARCHAR(2) DEFAULT 'in' CHECK (height_unit IN ('in', 'cm')),
  bmi DECIMAL(4,1),             -- auto-calculated
  pain_scale INTEGER CHECK (pain_scale >= 0 AND pain_scale <= 10),

  -- Behavioral Health Specific
  waist_circumference DECIMAL(5,1), -- inches or cm
  waist_unit VARCHAR(2) DEFAULT 'in' CHECK (waist_unit IN ('in', 'cm')),

  -- Flags
  has_abnormal_values BOOLEAN DEFAULT FALSE,
  abnormal_flags JSONB DEFAULT '[]',

  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vitals indexes
CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_encounter ON vitals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_vitals_organization ON vitals(organization_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded_at ON vitals(patient_id, recorded_at DESC);

-- =============================================
-- SCREENING SCORES TABLE
-- Behavioral health screening instruments
-- =============================================
CREATE TABLE IF NOT EXISTS screening_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  encounter_id UUID,
  administered_by UUID NOT NULL,

  -- Instrument identification
  instrument VARCHAR(20) NOT NULL CHECK (instrument IN (
    'PHQ9', 'GAD7', 'CSSRS', 'AUDITC', 'DAST10', 'MDQ', 'PCL5'
  )),

  -- Scores
  total_score INTEGER NOT NULL,
  severity VARCHAR(30),
  item_responses JSONB NOT NULL,

  -- Clinical context
  clinical_notes TEXT,
  risk_flags JSONB DEFAULT '[]',

  administered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Screening indexes
CREATE INDEX IF NOT EXISTS idx_screening_patient ON screening_scores(patient_id);
CREATE INDEX IF NOT EXISTS idx_screening_encounter ON screening_scores(encounter_id);
CREATE INDEX IF NOT EXISTS idx_screening_instrument ON screening_scores(patient_id, instrument, administered_at DESC);
CREATE INDEX IF NOT EXISTS idx_screening_organization ON screening_scores(organization_id);

-- =============================================
-- SMART TRIAGE RESULTS TABLE
-- Cached AI triage analysis results
-- =============================================
CREATE TABLE IF NOT EXISTS smart_triage_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  encounter_id UUID,

  triage_type VARCHAR(50) NOT NULL CHECK (triage_type IN (
    'medication_review', 'chart_summary', 'prescribing_check'
  )),
  safety_score INTEGER CHECK (safety_score >= 0 AND safety_score <= 100),
  result_data JSONB NOT NULL,

  -- Alert counts
  alerts_count INTEGER DEFAULT 0,
  critical_alerts_count INTEGER DEFAULT 0,

  -- Review tracking
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  acknowledged BOOLEAN DEFAULT FALSE,

  -- AI metadata
  ai_model VARCHAR(50),
  ai_prompt_version VARCHAR(20),
  token_count INTEGER,

  -- Cache management
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triage indexes
CREATE INDEX IF NOT EXISTS idx_smart_triage_patient ON smart_triage_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_smart_triage_encounter ON smart_triage_results(encounter_id);
CREATE INDEX IF NOT EXISTS idx_smart_triage_type ON smart_triage_results(patient_id, triage_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_triage_expires ON smart_triage_results(expires_at);

-- =============================================
-- MEDICATION INTERACTION LOG TABLE
-- Audit trail for DDI acknowledgments
-- =============================================
CREATE TABLE IF NOT EXISTS medication_interaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID NOT NULL,

  medication_a VARCHAR(200) NOT NULL,
  medication_b VARCHAR(200) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'moderate', 'low')),
  interaction_type VARCHAR(100),

  -- Provider action
  action_taken VARCHAR(50) NOT NULL CHECK (action_taken IN (
    'acknowledged', 'modified', 'overridden', 'alternative_chosen'
  )),
  provider_id UUID NOT NULL,
  provider_rationale TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interaction_log_patient ON medication_interaction_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_interaction_log_severity ON medication_interaction_log(severity);

-- =============================================
-- AI PROMPTS TABLE
-- Versioned prompt templates
-- =============================================
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  prompt_text TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_name ON ai_prompts(name, is_active);

-- =============================================
-- ROW LEVEL SECURITY
-- Uses auth.uid() directly — no dependency on helper functions
-- =============================================

-- Enable RLS
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_triage_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_interaction_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

-- VITALS POLICIES
CREATE POLICY "vitals_select" ON vitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "vitals_insert" ON vitals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vitals_update" ON vitals FOR UPDATE TO authenticated USING (true);

-- SCREENING SCORES POLICIES
CREATE POLICY "screenings_select" ON screening_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "screenings_insert" ON screening_scores FOR INSERT TO authenticated WITH CHECK (true);

-- SMART TRIAGE RESULTS POLICIES
CREATE POLICY "triage_select" ON smart_triage_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "triage_insert" ON smart_triage_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "triage_update" ON smart_triage_results FOR UPDATE TO authenticated USING (true);

-- MEDICATION INTERACTION LOG POLICIES
CREATE POLICY "interaction_log_select" ON medication_interaction_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "interaction_log_insert" ON medication_interaction_log FOR INSERT TO authenticated WITH CHECK (true);

-- AI PROMPTS POLICIES (read-only for authenticated users)
CREATE POLICY "prompts_select" ON ai_prompts FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "prompts_all" ON ai_prompts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- TRIGGERS (only if update_updated_at_column exists)
-- =============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE 'CREATE TRIGGER update_vitals_updated_at
      BEFORE UPDATE ON vitals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
    EXECUTE 'CREATE TRIGGER update_ai_prompts_updated_at
      BEFORE UPDATE ON ai_prompts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- =============================================
-- SEED: AI Prompt Templates
-- =============================================
INSERT INTO ai_prompts (name, version, prompt_text, description) VALUES
(
  'medication_smart_triage_behavioral_health',
  '1.0',
  'You are a clinical pharmacology AI assistant for psychiatric medication management. Analyze the following patient''s medication regimen for a psychiatric nurse practitioner.

PATIENT CONTEXT:
- Age: {age}, Sex: {sex}, Weight: {weight}kg
- Diagnoses: {diagnoses_list}
- Allergies: {allergies_list}
- Pregnancy status: {pregnancy_status}
- Renal function: {egfr_or_creatinine}
- Hepatic function: {liver_labs}

CURRENT MEDICATIONS:
{medications_list_with_doses_and_frequencies}

NEW PRESCRIPTION (if applicable):
{new_medication_name_dose_frequency}

RECENT LAB VALUES:
{lab_results_with_dates}

Analyze and return a JSON response with:
1. overall_safety_score (0-100)
2. drug_drug_interactions (array with: med_a, med_b, severity, mechanism, clinical_significance, recommended_action, alternative_suggestions)
3. black_box_warnings (array with: medication, warning_text, patient_relevance)
4. pregnancy_safety (array with: medication, fda_category, risk_description, trimester_concerns)
5. lab_monitoring (array with: medication, required_lab, last_checked, due_date, status)
6. metabolic_risk (object with: risk_level, contributing_factors, recommendations)
7. clinical_pearls (array of 2-3 brief clinical insights)
8. summary (2-3 sentence plain-language summary)',
  'Medication safety triage prompt for behavioral health NPs'
),
(
  'clinical_note_summary_behavioral_health',
  '1.0',
  'You are a clinical AI assistant for psychiatric chart review. Generate a concise clinical summary for a psychiatric nurse practitioner.

PATIENT: {patient_demographics}
DIAGNOSES: {active_diagnoses}
MEDICATIONS: {current_medications}
ALLERGIES: {allergies}

LAST 5 CLINICAL NOTES:
{clinical_notes_text}

SCREENING SCORES HISTORY:
{phq9_scores_with_dates}
{gad7_scores_with_dates}
{other_screening_scores}

LAB HISTORY:
{recent_labs}

VITALS TREND:
{weight_trend}
{bp_trend}

Generate a JSON response with:
1. clinical_summary (4-5 sentence narrative paragraph)
2. problem_list (array: problem, icd10, status, last_addressed_date)
3. medication_effectiveness (array: medication, dose, purpose, assessment, evidence_basis)
4. screening_trends (array: instrument, scores_array_with_dates, trend)
5. visit_alerts (array of 3-5 prioritized items with urgency and rationale)
6. suggested_agenda (brief 2-3 item suggested visit agenda)',
  'Clinical chart summary prompt for behavioral health NPs'
)
ON CONFLICT (name) DO NOTHING;
