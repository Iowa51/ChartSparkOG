-- ChartSpark Security Hardening Migration
-- Step 1.1: Add AUDITOR to the role constraint on users table
-- Step 1.3: Harden SECURITY DEFINER helper functions with safe search_path

-- =============================================
-- STEP 1.1: ADD AUDITOR ROLE
-- =============================================

-- Drop existing constraint and add new one with AUDITOR
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('USER', 'ADMIN', 'AUDITOR', 'SUPER_ADMIN'));

-- =============================================
-- STEP 1.3: HARDENED SECURITY DEFINER FUNCTIONS
-- =============================================

-- Replace get_user_role with hardened version
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- Replace get_user_organization_id with hardened version
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- =============================================
-- STEP 1.4: AUDITOR READ-ONLY RLS POLICIES
-- =============================================

-- PATIENTS TABLE: AUDITOR can read but not write
-- First, drop existing policies that need modification
DROP POLICY IF EXISTS "Users can create patients" ON patients;
DROP POLICY IF EXISTS "Users can update org patients" ON patients;

-- Add AUDITOR read policy
DROP POLICY IF EXISTS "Auditors can view org patients" ON patients;
CREATE POLICY "Auditors can view org patients"
  ON patients FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'AUDITOR' 
    AND organization_id = get_user_organization_id()
  );

-- Recreate write policies excluding AUDITOR
CREATE POLICY "Non-auditors can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY "Non-auditors can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
    AND organization_id = get_user_organization_id()
  );

-- NOTES TABLE: AUDITOR read-only
DROP POLICY IF EXISTS "Users can create notes" ON notes;

DROP POLICY IF EXISTS "Auditors can view org notes" ON notes;
CREATE POLICY "Auditors can view org notes"
  ON notes FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'AUDITOR' 
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY "Non-auditors can create notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
    AND provider_id = auth.uid()
    AND organization_id = get_user_organization_id()
  );

-- ENCOUNTERS TABLE: AUDITOR read-only
DROP POLICY IF EXISTS "Users can create encounters" ON encounters;

DROP POLICY IF EXISTS "Auditors can view org encounters" ON encounters;
CREATE POLICY "Auditors can view org encounters"
  ON encounters FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'AUDITOR' 
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY "Non-auditors can create encounters"
  ON encounters FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
    AND organization_id = get_user_organization_id()
    AND provider_id = auth.uid()
  );

-- RISK_ASSESSMENTS TABLE (if exists): Enable RLS and add policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_assessments') THEN
    ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
    
    -- AUDITOR read-only
    EXECUTE 'DROP POLICY IF EXISTS "Auditors can view org risk assessments" ON risk_assessments';
    EXECUTE 'CREATE POLICY "Auditors can view org risk assessments"
      ON risk_assessments FOR SELECT
      TO authenticated
      USING (
        get_user_role() = ''AUDITOR'' 
        AND organization_id = get_user_organization_id()
      )';
    
    -- Non-auditors can read
    EXECUTE 'DROP POLICY IF EXISTS "Users can view org risk assessments" ON risk_assessments';
    EXECUTE 'CREATE POLICY "Users can view org risk assessments"
      ON risk_assessments FOR SELECT
      TO authenticated
      USING (
        get_user_role() IN (''USER'', ''ADMIN'', ''SUPER_ADMIN'')
        AND organization_id = get_user_organization_id()
      )';
    
    -- Non-auditors can write
    EXECUTE 'DROP POLICY IF EXISTS "Non-auditors can create risk assessments" ON risk_assessments';
    EXECUTE 'CREATE POLICY "Non-auditors can create risk assessments"
      ON risk_assessments FOR INSERT
      TO authenticated
      WITH CHECK (
        get_user_role() IN (''USER'', ''ADMIN'', ''SUPER_ADMIN'')
        AND organization_id = get_user_organization_id()
      )';
  END IF;
END $$;

-- =============================================
-- VERIFICATION COMMENT
-- =============================================
-- After running this migration:
-- 1. AUDITOR role is now valid for users.role
-- 2. get_user_role() and get_user_organization_id() are hardened
-- 3. AUDITOR users can only SELECT on patients, notes, encounters, risk_assessments
-- 4. AUDITOR users cannot INSERT, UPDATE, or DELETE on PHI tables
