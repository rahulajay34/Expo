-- Run this in Supabase SQL Editor to:
-- 1. Change default credits to 0 for new users
-- 2. Add the admin update policy if missing

-- Update the default value for credits column
ALTER TABLE profiles ALTER COLUMN credits SET DEFAULT 0;

-- Update the handle_new_user function to create profiles with 0 credits
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, credits)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add policy for admins to update all profiles (if it doesn't exist)
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
