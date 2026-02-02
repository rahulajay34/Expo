-- Run this in Supabase SQL Editor to fix profile loading issues
-- This fixes:
-- 1. Default credits to 0 for new users
-- 2. RLS policies that were causing queries to hang
-- 3. Admin update policy for budget management

-- ============================================
-- FIX 1: Update default credits to 0
-- ============================================
ALTER TABLE profiles ALTER COLUMN credits SET DEFAULT 0;

-- ============================================
-- FIX 2: Recreate is_admin() to use SECURITY DEFINER properly
-- This prevents infinite recursion in RLS policies
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role text;
BEGIN
  -- Direct query that bypasses RLS
  SELECT role::text INTO user_role 
  FROM profiles 
  WHERE id = auth.uid();
  
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- FIX 3: Update the handle_new_user function for 0 credits
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, credits)
  VALUES (NEW.id, NEW.email, 'user', 0)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX 4: Drop and recreate profile policies to ensure clean state
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Recreate policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- ============================================
-- VERIFY: Check policies are set up correctly
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
