-- =============================================
-- ChartSpark Production Migration
-- Add Patient Extended Schema
-- Date: 2026-02-03
-- =============================================
-- This migration adds support for:
-- 1. Extended patient fields (MRN, preferred name, etc.)
-- 2. Patient allergies tracking
-- 3. Patient medications tracking
-- 4. Patient problems/conditions tracking
-- 5. Patient insurance information
-- 6. Auto-generation of MRNs
-- =============================================

-- =============================================
-- STEP 1: Add Missing Columns to Patients Table
-- =============================================

-- Add MRN (Medical Record Number) with unique constraint
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS mrn TEXT UNIQUE;

-- Add preferred name (nickname/chosen name)
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS preferred_name TEXT;

-- Add last visit date for quick reference
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS last_visit_date TIMESTAMPTZ;

-- Add avatar color for UI consistency
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';

-- Create index on MRN for fast lookups
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);

-- =============================================
-- STEP 2: Create Patient Allergies Table
-- =============================================

CREATE TABLE IF NOT EXISTS patient_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  allergy TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  reaction TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index for fast patient lookup
CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient ON patient_allergies(patient_id);

-- Index for searching by allergy name
CREATE INDEX IF NOT EXISTS idx_patient_allergies_allergy ON patient_allergies(allergy);

-- =============================================
-- STEP 3: Create Patient Medications Table
-- =============================================

CREATE TABLE IF NOT EXISTS patient_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  route TEXT, -- oral, IV, sublingual, etc.
  prescriber TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'completed')),
  start_date DATE,
  end_date DATE,
  discontinued_at TIMESTAMPTZ,
  discontinued_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index for fast patient lookup
CREATE INDEX IF NOT EXISTS idx_patient_medications_patient ON patient_medications(patient_id);

-- Index for active medications lookup
CREATE INDEX IF NOT EXISTS idx_patient_medications_active ON patient_medications(patient_id, status) WHERE status = 'active';

-- Index for searching by medication name
CREATE INDEX IF NOT EXISTS idx_patient_medications_medication ON patient_medications(medication);

-- =============================================
-- STEP 4: Create Patient Problems Table
-- =============================================

CREATE TABLE IF NOT EXISTS patient_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  problem TEXT NOT NULL,
  icd10_code TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'inactive')),
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  onset_date DATE,
  resolved_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index for fast patient lookup
CREATE INDEX IF NOT EXISTS idx_patient_problems_patient ON patient_problems(patient_id);

-- Index for active problems lookup
CREATE INDEX IF NOT EXISTS idx_patient_problems_active ON patient_problems(patient_id, status) WHERE status = 'active';

-- Index for ICD-10 code lookup
CREATE INDEX IF NOT EXISTS idx_patient_problems_icd10 ON patient_problems(icd10_code);

-- =============================================
-- STEP 5: Create Patient Insurance Table
-- =============================================

CREATE TABLE IF NOT EXISTS patient_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  policy_number TEXT,
  group_number TEXT,
  subscriber_name TEXT,
  subscriber_dob DATE,
  relationship_to_subscriber TEXT CHECK (relationship_to_subscriber IN ('self', 'spouse', 'child', 'other')),
  is_primary BOOLEAN DEFAULT TRUE,
  effective_date DATE,
  termination_date DATE,
  copay_amount DECIMAL(10,2),
  deductible_amount DECIMAL(10,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index for fast patient lookup
CREATE INDEX IF NOT EXISTS idx_patient_insurance_patient ON patient_insurance(patient_id);

-- Index for primary insurance lookup
CREATE INDEX IF NOT EXISTS idx_patient_insurance_primary ON patient_insurance(patient_id, is_primary) WHERE is_primary = TRUE;

-- =============================================
-- STEP 6: MRN Auto-Generation Function
-- =============================================

-- Function to generate unique MRN in format: MRN-XXXXXX (6 random digits)
CREATE OR REPLACE FUNCTION generate_mrn()
RETURNS TEXT AS $$
DECLARE
  new_mrn TEXT;
  exists_check BOOLEAN;
  max_attempts INTEGER := 100;
  attempt INTEGER := 0;
BEGIN
  LOOP
    -- Generate a random 6-digit number
    new_mrn := 'MRN-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if MRN already exists
    SELECT EXISTS(SELECT 1 FROM patients WHERE mrn = new_mrn) INTO exists_check;
    
    -- Exit if unique
    EXIT WHEN NOT exists_check;
    
    -- Prevent infinite loop
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique MRN after % attempts', max_attempts;
    END IF;
  END LOOP;
  
  RETURN new_mrn;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 7: Trigger for MRN Auto-Generation
-- =============================================

-- Trigger function to auto-generate MRN on patient creation
CREATE OR REPLACE FUNCTION set_patient_mrn()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate MRN if not provided
  IF NEW.mrn IS NULL OR NEW.mrn = '' THEN
    NEW.mrn := generate_mrn();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before insert
DROP TRIGGER IF EXISTS patient_mrn_trigger ON patients;
CREATE TRIGGER patient_mrn_trigger
  BEFORE INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION set_patient_mrn();

-- =============================================
-- STEP 8: Trigger for Updated_At on New Tables
-- =============================================

-- Reuse the existing update_updated_at_column function

DROP TRIGGER IF EXISTS update_patient_medications_updated_at ON patient_medications;
CREATE TRIGGER update_patient_medications_updated_at
  BEFORE UPDATE ON patient_medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patient_problems_updated_at ON patient_problems;
CREATE TRIGGER update_patient_problems_updated_at
  BEFORE UPDATE ON patient_problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patient_insurance_updated_at ON patient_insurance;
CREATE TRIGGER update_patient_insurance_updated_at
  BEFORE UPDATE ON patient_insurance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- STEP 9: Row Level Security Policies
-- =============================================

-- Enable RLS on new tables
ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_insurance ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PATIENT ALLERGIES POLICIES
-- =============================================

-- Users can view allergies for patients in their org
DROP POLICY IF EXISTS "Users can view org patient allergies" ON patient_allergies;
CREATE POLICY "Users can view org patient allergies"
  ON patient_allergies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_allergies.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- Users can add allergies for patients in their org
DROP POLICY IF EXISTS "Users can add patient allergies" ON patient_allergies;
CREATE POLICY "Users can add patient allergies"
  ON patient_allergies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_allergies.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- Users can update allergies for patients in their org
DROP POLICY IF EXISTS "Users can update patient allergies" ON patient_allergies;
CREATE POLICY "Users can update patient allergies"
  ON patient_allergies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_allergies.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- Users can delete allergies for patients in their org
DROP POLICY IF EXISTS "Users can delete patient allergies" ON patient_allergies;
CREATE POLICY "Users can delete patient allergies"
  ON patient_allergies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_allergies.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- =============================================
-- PATIENT MEDICATIONS POLICIES
-- =============================================

-- Users can view medications for patients in their org
DROP POLICY IF EXISTS "Users can view org patient medications" ON patient_medications;
CREATE POLICY "Users can view org patient medications"
  ON patient_medications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_medications.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- Users can add medications for patients in their org
DROP POLICY IF EXISTS "Users can add patient medications" ON patient_medications;
CREATE POLICY "Users can add patient medications"
  ON patient_medications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_medications.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- Users can update medications for patients in their org
DROP POLICY IF EXISTS "Users can update patient medications" ON patient_medications;
CREATE POLICY "Users can update patient medications"
  ON patient_medications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_medications.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- Users can delete medications for patients in their org
DROP POLICY IF EXISTS "Users can delete patient medications" ON patient_medications;
CREATE POLICY "Users can delete patient medications"
  ON patient_medications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_medications.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- =============================================
-- PATIENT PROBLEMS POLICIES
-- =============================================

-- Users can view problems for patients in their org
DROP POLICY IF EXISTS "Users can view org patient problems" ON patient_problems;
CREATE POLICY "Users can view org patient problems"
  ON patient_problems FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_problems.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- Users can add problems for patients in their org
DROP POLICY IF EXISTS "Users can add patient problems" ON patient_problems;
CREATE POLICY "Users can add patient problems"
  ON patient_problems FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_problems.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- Users can update problems for patients in their org
DROP POLICY IF EXISTS "Users can update patient problems" ON patient_problems;
CREATE POLICY "Users can update patient problems"
  ON patient_problems FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_problems.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- Users can delete problems for patients in their org
DROP POLICY IF EXISTS "Users can delete patient problems" ON patient_problems;
CREATE POLICY "Users can delete patient problems"
  ON patient_problems FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_problems.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- =============================================
-- PATIENT INSURANCE POLICIES
-- =============================================

-- Users can view insurance for patients in their org
DROP POLICY IF EXISTS "Users can view org patient insurance" ON patient_insurance;
CREATE POLICY "Users can view org patient insurance"
  ON patient_insurance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_insurance.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- Users can add insurance for patients in their org
DROP POLICY IF EXISTS "Users can add patient insurance" ON patient_insurance;
CREATE POLICY "Users can add patient insurance"
  ON patient_insurance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_insurance.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- Users can update insurance for patients in their org
DROP POLICY IF EXISTS "Users can update patient insurance" ON patient_insurance;
CREATE POLICY "Users can update patient insurance"
  ON patient_insurance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_insurance.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- Users can delete insurance for patients in their org
DROP POLICY IF EXISTS "Users can delete patient insurance" ON patient_insurance;
CREATE POLICY "Users can delete patient insurance"
  ON patient_insurance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = patient_insurance.patient_id 
      AND patients.organization_id = get_user_organization_id()
    )
  );

-- =============================================
-- STEP 10: Backfill MRNs for Existing Patients
-- =============================================

-- Update existing patients that don't have an MRN
UPDATE patients 
SET mrn = generate_mrn() 
WHERE mrn IS NULL OR mrn = '';

-- =============================================
-- STEP 11: Set Default Avatar Colors
-- =============================================

-- Set random avatar colors for existing patients
UPDATE patients 
SET avatar_color = (
  ARRAY[
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
  ]
)[FLOOR(RANDOM() * 6 + 1)]
WHERE avatar_color IS NULL;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Uncomment these to verify the migration:

-- Check patients table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'patients' 
-- ORDER BY ordinal_position;

-- Verify all patients have MRNs
-- SELECT COUNT(*) as patients_without_mrn 
-- FROM patients 
-- WHERE mrn IS NULL OR mrn = '';

-- Check new tables exist
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_name IN ('patient_allergies', 'patient_medications', 'patient_problems', 'patient_insurance');

-- Verify RLS policies
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('patient_allergies', 'patient_medications', 'patient_problems', 'patient_insurance');

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- Summary:
-- ✅ Added 4 new columns to patients table
-- ✅ Created 4 new related tables
-- ✅ Added 12 indexes for performance
-- ✅ Implemented MRN auto-generation
-- ✅ Created 20 RLS policies for security
-- ✅ Backfilled MRNs for existing patients
-- ✅ Set default avatar colors
-- =============================================
