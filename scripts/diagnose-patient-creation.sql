-- =============================================
-- ChartSpark Patient Creation Diagnostic
-- Run this in Supabase SQL Editor to diagnose issues
-- =============================================

-- 1. Check if required tables exist
SELECT
  'patients' as table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') as exists
UNION ALL
SELECT 'users', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
UNION ALL
SELECT 'profiles', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
UNION ALL
SELECT 'organizations', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
UNION ALL
SELECT 'patient_allergies', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_allergies')
UNION ALL
SELECT 'patient_medications', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_medications')
UNION ALL
SELECT 'patient_problems', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_problems')
UNION ALL
SELECT 'patient_insurance', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_insurance');

-- 2. Check if helper functions exist
SELECT
  'get_user_organization_id' as function_name,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_user_organization_id') as exists
UNION ALL
SELECT 'get_user_role', EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_user_role');

-- 3. Check RLS policies on patients table
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'patients'
ORDER BY cmd, policyname;

-- 4. Check if current user has data in users table
SELECT
  id,
  email,
  role,
  organization_id,
  'users' as source_table
FROM users
WHERE id = auth.uid()
UNION ALL
SELECT
  id,
  email,
  role,
  organization_id,
  'profiles' as source_table
FROM profiles
WHERE id = auth.uid();

-- 5. Check organization exists
SELECT
  o.id,
  o.name,
  o.subscription_status
FROM organizations o
JOIN users u ON u.organization_id = o.id
WHERE u.id = auth.uid();

-- 6. Test the helper functions
SELECT
  get_user_organization_id() as user_org_id,
  get_user_role() as user_role;

-- =============================================
-- FIXES: Run these if issues are found
-- =============================================

-- FIX 1: If user exists in profiles but not users, sync them:
/*
INSERT INTO users (id, email, first_name, last_name, role, organization_id)
SELECT p.id, p.email, p.first_name, p.last_name, p.role, p.organization_id
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.id);
*/

-- FIX 2: If patient_allergies/medications/problems/insurance tables don't exist,
-- run the migration: supabase/migrations/20260203_patient_extended_schema.sql

-- FIX 3: If get_user_organization_id() returns NULL but organization exists,
-- check that the user's organization_id is set in the users table:
/*
UPDATE users SET organization_id = 'YOUR_ORG_ID_HERE' WHERE id = auth.uid();
*/
