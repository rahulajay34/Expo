-- Migration to add INSERT policy for profiles table
-- This allows new users to create their profile on first login

-- Add INSERT policy for profiles (users can create their own profile)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Also add policy for service role / triggers to create profiles
-- This is useful if you have a trigger that creates profiles on user signup
CREATE POLICY "Service role can insert profiles"
ON profiles FOR INSERT
WITH CHECK (true);
