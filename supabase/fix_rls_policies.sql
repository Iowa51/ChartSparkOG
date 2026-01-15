-- ChartSpark RLS Policy Fix
-- Run this in the Supabase SQL Editor to fix the infinite recursion error
-- Generated: 2026-01-14

-- =============================================
-- FIX: Infinite recursion in users table policies
-- The issue is that policies call get_user_role() or get_user_organization_id()
-- which query the users table, triggering the same policies recursively.
-- =============================================

-- Step 1: Drop the problematic helper functions
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS get_user_organization_id();

-- Step 2: Drop existing users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view org users" ON users;
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Step 3: Recreate policies using direct auth.uid() checks (no helper functions)
-- This avoids the recursion since we don't query the users table within the policy

-- Users can always view their own profile
CREATE POLICY "Users can view own profile" 
  ON users FOR SELECT 
  TO authenticated 
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON users FOR UPDATE 
  TO authenticated 
  USING (id = auth.uid());

-- For admin access, we need a different approach using a security definer function
-- that doesn't trigger RLS

-- Step 4: Create a safe helper function that bypasses RLS
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM users 
  WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id 
  FROM users 
  WHERE id = auth.uid();
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 5: Create admin policies using the safe helper functions
-- Admins can view users in their organization
CREATE POLICY "Admins can view org users" 
  ON users FOR SELECT 
  TO authenticated 
  USING (
    organization_id = get_my_organization_id()
    AND get_my_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

-- Super admins can view all users
CREATE POLICY "Super admins can view all users" 
  ON users FOR SELECT 
  TO authenticated 
  USING (get_my_role() = 'SUPER_ADMIN');

-- =============================================
-- Verify the fix by testing a query
-- After running this, try: SELECT * FROM users WHERE id = auth.uid();
-- It should return your user record without recursion errors
-- =============================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS policy fix completed successfully!';
END $$;
