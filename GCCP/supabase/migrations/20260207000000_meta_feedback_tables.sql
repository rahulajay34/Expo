-- ============================================
-- Meta-Quality Feedback Tables Migration
-- Stores cumulative prompt improvement feedback
-- ============================================

-- ============================================
-- ADD COLUMNS TO GENERATIONS TABLE
-- ============================================

ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS meta_analysis_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS meta_analysis_timestamp TIMESTAMPTZ;

-- ============================================
-- CREATE META_FEEDBACK TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS meta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode content_mode NOT NULL UNIQUE,
  feedback_content JSONB NOT NULL DEFAULT '{
    "scores": {
      "formatting": 0,
      "pedagogy": 0,
      "clarity": 0,
      "structure": 0,
      "consistency": 0,
      "factualAccuracy": 0
    },
    "scoreTrends": {},
    "issuesClusters": [],
    "strengths": [],
    "overallAssessment": ""
  }'::jsonb,
  generation_count INTEGER DEFAULT 0 NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for efficient mode lookups
CREATE INDEX IF NOT EXISTS idx_meta_feedback_mode ON meta_feedback(mode);

-- ============================================
-- CREATE META_FEEDBACK_HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS meta_feedback_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode content_mode NOT NULL,
  feedback_content JSONB NOT NULL,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  acknowledged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- Create index for efficient mode lookups in history
CREATE INDEX IF NOT EXISTS idx_meta_feedback_history_mode ON meta_feedback_history(mode);
CREATE INDEX IF NOT EXISTS idx_meta_feedback_history_acknowledged_at ON meta_feedback_history(acknowledged_at DESC);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE meta_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_feedback_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- META_FEEDBACK POLICIES (Admin read/write only)
-- ============================================

-- Admins can view all meta_feedback
CREATE POLICY "Admins can view meta_feedback"
  ON meta_feedback FOR SELECT
  USING (is_admin());

-- Admins can insert meta_feedback
CREATE POLICY "Admins can insert meta_feedback"
  ON meta_feedback FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update meta_feedback
CREATE POLICY "Admins can update meta_feedback"
  ON meta_feedback FOR UPDATE
  USING (is_admin());

-- Admins can delete meta_feedback
CREATE POLICY "Admins can delete meta_feedback"
  ON meta_feedback FOR DELETE
  USING (is_admin());

-- Service role needs access for background processing
-- The orchestrator runs server-side with service role
CREATE POLICY "Service role can manage meta_feedback"
  ON meta_feedback FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- META_FEEDBACK_HISTORY POLICIES (Admin read only)
-- ============================================

-- Admins can view all meta_feedback_history
CREATE POLICY "Admins can view meta_feedback_history"
  ON meta_feedback_history FOR SELECT
  USING (is_admin());

-- Admins can insert to meta_feedback_history (for archiving)
CREATE POLICY "Admins can insert meta_feedback_history"
  ON meta_feedback_history FOR INSERT
  WITH CHECK (is_admin());

-- Service role needs insert access for archiving
CREATE POLICY "Service role can insert meta_feedback_history"
  ON meta_feedback_history FOR INSERT
  WITH CHECK (true);

-- ============================================
-- ENABLE REALTIME FOR META_FEEDBACK
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE meta_feedback;

-- ============================================
-- INITIALIZE DEFAULT ROWS FOR EACH MODE
-- ============================================

INSERT INTO meta_feedback (mode) VALUES 
  ('pre-read'),
  ('lecture'),
  ('assignment')
ON CONFLICT (mode) DO NOTHING;
