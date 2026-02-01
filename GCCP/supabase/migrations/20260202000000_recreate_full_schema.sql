-- GCCP Database Recreation Script
-- Run this if the database was accidentally deleted
-- This will recreate all tables, enums, functions, triggers, and policies

-- ============================================
-- DROP EXISTING (if any remnants exist)
-- ============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_generations_updated_at ON generations;

-- Drop tables (cascade will handle dependencies)
DROP TABLE IF EXISTS checkpoints CASCADE;
DROP TABLE IF EXISTS generation_logs CASCADE;
DROP TABLE IF EXISTS generations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- Drop types (enums)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS generation_status CASCADE;
DROP TYPE IF EXISTS content_mode CASCADE;
DROP TYPE IF EXISTS log_type CASCADE;

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'user');

CREATE TYPE generation_status AS ENUM (
  'queued',
  'processing', 
  'completed',
  'failed',
  'waiting_approval'
);

CREATE TYPE content_mode AS ENUM ('pre-read', 'lecture', 'assignment');

CREATE TYPE log_type AS ENUM ('info', 'success', 'warning', 'error', 'step');

-- ============================================
-- CREATE TABLES
-- ============================================

-- Profiles: Extends Supabase Auth
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,
  credits INTEGER DEFAULT 100 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Generations: Main project container
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subtopics TEXT NOT NULL,
  mode content_mode NOT NULL,
  status generation_status DEFAULT 'queued' NOT NULL,
  current_step INTEGER DEFAULT 0 NOT NULL,
  transcript TEXT,
  final_content TEXT,
  assignment_data JSONB,
  gap_analysis JSONB,
  course_context JSONB,
  error_message TEXT,
  estimated_cost DECIMAL(10, 6) DEFAULT 0 NOT NULL,
  locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Generation Logs: Console output for UI
CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  message TEXT NOT NULL,
  log_type log_type DEFAULT 'info' NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Checkpoints: For retry/resume logic
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  content_snapshot TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_status ON generations(status);
CREATE INDEX idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX idx_generation_logs_generation_id ON generation_logs(generation_id);
CREATE INDEX idx_generation_logs_created_at ON generation_logs(created_at);
CREATE INDEX idx_checkpoints_generation_id ON checkpoints(generation_id);
CREATE INDEX idx_checkpoints_step_number ON checkpoints(generation_id, step_number DESC);

-- ============================================
-- CREATE FUNCTIONS
-- ============================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, credits)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    100
  )
  ON CONFLICT (id) DO NOTHING; -- Handle race conditions gracefully
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Auto-update updated_at for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for generations  
CREATE TRIGGER update_generations_updated_at
  BEFORE UPDATE ON generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (for manual profile creation on first login)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Allow service role / triggers to create profiles (for the auth trigger)
-- This is permissive to allow the trigger function to work
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- ============================================
-- GENERATIONS POLICIES
-- ============================================

-- Users can view their own generations
CREATE POLICY "Users can view own generations"
  ON generations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own generations
CREATE POLICY "Users can insert own generations"
  ON generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own generations (if not locked)
CREATE POLICY "Users can update own generations"
  ON generations FOR UPDATE
  USING (auth.uid() = user_id AND locked_by IS NULL);

-- Users can delete their own generations
CREATE POLICY "Users can delete own generations"
  ON generations FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all generations
CREATE POLICY "Admins can view all generations"
  ON generations FOR SELECT
  USING (is_admin());

-- Admins can update all generations
CREATE POLICY "Admins can update all generations"
  ON generations FOR UPDATE
  USING (is_admin());

-- ============================================
-- GENERATION LOGS POLICIES
-- ============================================

-- Users can view logs of their own generations
CREATE POLICY "Users can view logs of own generations"
  ON generation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM generations 
      WHERE generations.id = generation_logs.generation_id 
      AND generations.user_id = auth.uid()
    )
  );

-- Users can insert logs to their own generations
CREATE POLICY "Users can insert logs to own generations"
  ON generation_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM generations 
      WHERE generations.id = generation_logs.generation_id 
      AND generations.user_id = auth.uid()
    )
  );

-- Admins can view all logs
CREATE POLICY "Admins can view all logs"
  ON generation_logs FOR SELECT
  USING (is_admin());

-- ============================================
-- CHECKPOINTS POLICIES
-- ============================================

-- Users can view checkpoints of their own generations
CREATE POLICY "Users can view checkpoints of own generations"
  ON checkpoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM generations 
      WHERE generations.id = checkpoints.generation_id 
      AND generations.user_id = auth.uid()
    )
  );

-- Users can insert checkpoints to their own generations
CREATE POLICY "Users can insert checkpoints to own generations"
  ON checkpoints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM generations 
      WHERE generations.id = checkpoints.generation_id 
      AND generations.user_id = auth.uid()
    )
  );

-- Admins can view all checkpoints
CREATE POLICY "Admins can view all checkpoints"
  ON checkpoints FOR SELECT
  USING (is_admin());

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Enable realtime for generation updates
ALTER PUBLICATION supabase_realtime ADD TABLE generations;
ALTER PUBLICATION supabase_realtime ADD TABLE generation_logs;

-- ============================================
-- CREATE PROFILES FOR EXISTING AUTH USERS
-- ============================================

-- This will create profiles for any users who signed up before the trigger existed
-- or whose profiles were deleted
INSERT INTO profiles (id, email, role, credits)
SELECT 
  id,
  email,
  'user',
  100
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
