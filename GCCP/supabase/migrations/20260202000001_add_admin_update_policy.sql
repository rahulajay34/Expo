-- Add policy for admins to update all profiles (for budget management)
-- Run this in Supabase SQL Editor if admins cannot update user budgets

-- First, drop the policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create policy allowing admins to update any profile
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Verify policies are set up correctly
-- You can run this query to check:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
