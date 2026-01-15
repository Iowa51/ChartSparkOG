-- ChartSpark RLS Policy Complete Reset
-- This script COMPLETELY removes and rebuilds all RLS policies for the users table
-- Run this in the Supabase SQL Editor
-- Generated: 2026-01-14

-- =============================================
-- STEP 1: Disable RLS temporarily to allow work
-- =============================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 2: Drop ALL existing policies on users table
-- =============================================
DO $$ 
DECLARE 
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', policy_name);
        RAISE NOTICE 'Dropped policy: %', policy_name;
    END LOOP;
END $$;

-- =============================================
-- STEP 3: Drop ALL helper functions that query users
-- =============================================
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS get_user_organization_id() CASCADE;
DROP FUNCTION IF EXISTS get_my_role() CASCADE;
DROP FUNCTION IF EXISTS get_my_organization_id() CASCADE;

-- =============================================
-- STEP 4: Create new SECURITY DEFINER helper functions
-- These execute with the privileges of the function owner (postgres)
-- This bypasses RLS during the function execution
-- =============================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Direct query without RLS (SECURITY DEFINER)
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  RETURN COALESCE(user_role, 'USER');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Direct query without RLS (SECURITY DEFINER)
  SELECT organization_id INTO org_id FROM users WHERE id = auth.uid();
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- =============================================
-- STEP 5: Re-enable RLS
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 6: Create simple, non-recursive policies
-- =============================================

-- Policy 1: Users can ALWAYS view their own row (no function call needed)
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Users can update their own row
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 3: Admins can view users in their org (uses safe helper)
CREATE POLICY "users_select_org_admin"
  ON users FOR SELECT
  TO authenticated
  USING (
    get_my_role() IN ('ADMIN', 'SUPER_ADMIN')
    AND organization_id = get_my_organization_id()
  );

-- Policy 4: Super admins can view all users
CREATE POLICY "users_select_all_super"
  ON users FOR SELECT
  TO authenticated
  USING (get_my_role() = 'SUPER_ADMIN');

-- Policy 5: Allow service role full access (for API operations)
CREATE POLICY "users_service_role_all"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- STEP 7: Verify policies were created
-- =============================================
SELECT policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename = 'users';

-- =============================================
-- Done! The policies should now work without recursion
-- =============================================
