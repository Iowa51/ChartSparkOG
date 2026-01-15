-- ============================================================
-- CHARTSPARK SECURITY REMEDIATION - STAGE 1: DATABASE FOUNDATION
-- Execute in Supabase SQL Editor in order
-- ============================================================

-- ============================================
-- 1.1 FIX ROLE CONSTRAINTS
-- ============================================
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('USER', 'ADMIN', 'AUDITOR', 'SUPER_ADMIN'));

-- ============================================
-- 1.2 ENSURE USERS TABLE STRUCTURE
-- ============================================

-- Ensure organization_id exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Ensure is_active exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Ensure foreign key to auth.users exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_id_fkey' 
    AND table_name = 'users'
  ) THEN
    BEGIN
      ALTER TABLE public.users 
      ADD CONSTRAINT users_id_fkey 
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
      -- Constraint already exists with different name, ignore
      NULL;
    END;
  END IF;
END $$;

-- ============================================
-- 1.3 HARDEN SECURITY DEFINER FUNCTIONS
-- ============================================

-- Drop and recreate get_user_role
DROP FUNCTION IF EXISTS public.get_user_role();
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Drop and recreate get_user_organization_id
DROP FUNCTION IF EXISTS public.get_user_organization_id();
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;

-- ============================================
-- 1.4 ENABLE RLS ON ALL PHI TABLES
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on optional tables if they exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinical_notes') THEN
    EXECUTE 'ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_assessments') THEN
    EXECUTE 'ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing') THEN
    EXECUTE 'ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ============================================
-- 1.5 RLS POLICIES - USERS TABLE
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view org users" ON public.users;
DROP POLICY IF EXISTS "Super admin full access" ON public.users;
DROP POLICY IF EXISTS "Super admin full access users" ON public.users;
DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Admins can view users in their organization
CREATE POLICY "Admins can view org users" ON public.users
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

-- Super admin can do everything
CREATE POLICY "Super admin full access users" ON public.users
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

-- ============================================
-- 1.5 RLS POLICIES - PATIENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view org patients" ON public.patients;
DROP POLICY IF EXISTS "Users can create patients" ON public.patients;
DROP POLICY IF EXISTS "Users can create org patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update org patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can delete org patients" ON public.patients;
DROP POLICY IF EXISTS "Super admin full access patients" ON public.patients;
DROP POLICY IF EXISTS "Non-auditors can create patients" ON public.patients;
DROP POLICY IF EXISTS "Non-auditors can update patients" ON public.patients;
DROP POLICY IF EXISTS "Auditors can view org patients" ON public.patients;

-- View: Users can see patients in their org (including AUDITOR)
CREATE POLICY "Users can view org patients" ON public.patients
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() = 'SUPER_ADMIN'
  );

-- Create: Only USER, ADMIN, SUPER_ADMIN (not AUDITOR)
CREATE POLICY "Users can create org patients" ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

-- Update: Only USER, ADMIN, SUPER_ADMIN (not AUDITOR)
CREATE POLICY "Users can update org patients" ON public.patients
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

-- Delete: Only ADMIN, SUPER_ADMIN
CREATE POLICY "Admins can delete org patients" ON public.patients
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

-- ============================================
-- 1.5 RLS POLICIES - NOTES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view org notes" ON public.notes;
DROP POLICY IF EXISTS "Users can view own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can create notes" ON public.notes;
DROP POLICY IF EXISTS "Users can create org notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update org notes" ON public.notes;
DROP POLICY IF EXISTS "Super admin full access notes" ON public.notes;
DROP POLICY IF EXISTS "Admins can view org notes" ON public.notes;
DROP POLICY IF EXISTS "Non-auditors can create notes" ON public.notes;
DROP POLICY IF EXISTS "Auditors can view org notes" ON public.notes;

CREATE POLICY "Users can view org notes" ON public.notes
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() = 'SUPER_ADMIN'
  );

CREATE POLICY "Users can create org notes" ON public.notes
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

CREATE POLICY "Users can update org notes" ON public.notes
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

-- ============================================
-- 1.5 RLS POLICIES - ENCOUNTERS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view org encounters" ON public.encounters;
DROP POLICY IF EXISTS "Users can create encounters" ON public.encounters;
DROP POLICY IF EXISTS "Users can update own encounters" ON public.encounters;
DROP POLICY IF EXISTS "Non-auditors can create encounters" ON public.encounters;
DROP POLICY IF EXISTS "Auditors can view org encounters" ON public.encounters;

CREATE POLICY "Users can view org encounters" ON public.encounters
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() = 'SUPER_ADMIN'
  );

CREATE POLICY "Users can create org encounters" ON public.encounters
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

CREATE POLICY "Users can update org encounters" ON public.encounters
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

-- ============================================
-- 1.5 RLS POLICIES - APPOINTMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view org appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can manage org appointments" ON public.appointments;

CREATE POLICY "Users can view org appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() = 'SUPER_ADMIN'
  );

CREATE POLICY "Users can manage org appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

-- ============================================
-- 1.5 RLS POLICIES - AUDIT_LOGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view org audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admin full access audit" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admins and auditors can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admins can manage audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Server can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Users can see their own audit logs
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins and Auditors can view org audit logs
CREATE POLICY "Admins can view org audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('ADMIN', 'AUDITOR', 'SUPER_ADMIN')
  );

-- Super admin sees all
CREATE POLICY "Super admin full access audit" ON public.audit_logs
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- ============================================
-- 1.5 RLS POLICIES - RISK_ASSESSMENTS (if exists)
-- ============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_assessments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view org risk assessments" ON public.risk_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create org risk assessments" ON public.risk_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "Auditors can view org risk assessments" ON public.risk_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "Non-auditors can create risk assessments" ON public.risk_assessments';
    
    EXECUTE 'CREATE POLICY "Users can view org risk assessments" ON public.risk_assessments
      FOR SELECT TO authenticated
      USING (
        organization_id = public.get_user_organization_id()
        OR public.get_user_role() = ''SUPER_ADMIN''
      )';
    
    EXECUTE 'CREATE POLICY "Users can create org risk assessments" ON public.risk_assessments
      FOR INSERT TO authenticated
      WITH CHECK (
        organization_id = public.get_user_organization_id()
        AND public.get_user_role() IN (''USER'', ''ADMIN'', ''SUPER_ADMIN'')
      )';
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES (run separately to verify)
-- ============================================
/*
-- Verify role constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%role%';

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = TRUE;

-- List all policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/
