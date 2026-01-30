-- GCCP Production Enhancement Migration
-- Phase 1: Core Architecture Updates

-- ============================================
-- GENERATIONS TABLE ENHANCEMENTS
-- ============================================

-- Add new columns for real-time progress tracking
ALTER TABLE generations ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS progress_message TEXT DEFAULT 'Initializing...' NOT NULL;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS partial_content TEXT;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS current_agent TEXT;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS resume_token TEXT;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS last_checkpoint_step INTEGER DEFAULT 0;

-- Add constraint for progress_percent range
ALTER TABLE generations ADD CONSTRAINT chk_progress_percent 
    CHECK (progress_percent >= 0 AND progress_percent <= 100);

-- ============================================
-- GENERATION METRICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS generation_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL,
    stage_weight DECIMAL(5, 2) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    token_count INTEGER,
    cost_estimate DECIMAL(10, 6),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for generation_metrics
CREATE INDEX IF NOT EXISTS idx_generation_metrics_generation_id ON generation_metrics(generation_id);
CREATE INDEX IF NOT EXISTS idx_generation_metrics_stage_name ON generation_metrics(stage_name);
CREATE INDEX IF NOT EXISTS idx_generation_metrics_created_at ON generation_metrics(created_at);

-- ============================================
-- HISTORICAL TIMING DATA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS historical_timing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_name TEXT NOT NULL,
    mode content_mode NOT NULL,
    avg_duration_ms INTEGER NOT NULL,
    min_duration_ms INTEGER,
    max_duration_ms INTEGER,
    sample_count INTEGER DEFAULT 1 NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(stage_name, mode)
);

-- Indexes for historical_timing
CREATE INDEX IF NOT EXISTS idx_historical_timing_stage_mode ON historical_timing(stage_name, mode);
CREATE INDEX IF NOT EXISTS idx_historical_timing_updated ON historical_timing(last_updated);

-- ============================================
-- FEEDBACK SCORES TABLE (For Critic Agent)
-- ============================================

CREATE TABLE IF NOT EXISTS feedback_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    iteration INTEGER NOT NULL,
    overall_score DECIMAL(3, 2) NOT NULL,
    completeness_score DECIMAL(3, 2),
    accuracy_score DECIMAL(3, 2),
    pedagogy_score DECIMAL(3, 2),
    formatting_score DECIMAL(3, 2),
    feedback_text TEXT,
    suggestions JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for feedback_scores
CREATE INDEX IF NOT EXISTS idx_feedback_scores_generation_id ON feedback_scores(generation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_scores_agent_name ON feedback_scores(agent_name);
CREATE INDEX IF NOT EXISTS idx_feedback_scores_overall ON feedback_scores(overall_score);

-- Add constraint for score range (0.00 to 1.00)
ALTER TABLE feedback_scores ADD CONSTRAINT chk_overall_score 
    CHECK (overall_score >= 0 AND overall_score <= 1);
ALTER TABLE feedback_scores ADD CONSTRAINT chk_completeness_score 
    CHECK (completeness_score >= 0 AND completeness_score <= 1);
ALTER TABLE feedback_scores ADD CONSTRAINT chk_accuracy_score 
    CHECK (accuracy_score >= 0 AND accuracy_score <= 1);
ALTER TABLE feedback_scores ADD CONSTRAINT chk_pedagogy_score 
    CHECK (pedagogy_score >= 0 AND pedagogy_score <= 1);
ALTER TABLE feedback_scores ADD CONSTRAINT chk_formatting_score 
    CHECK (formatting_score >= 0 AND formatting_score <= 1);

-- ============================================
-- USER PREFERENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    default_mode content_mode DEFAULT 'lecture',
    auto_save BOOLEAN DEFAULT true,
    show_preview BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'system',
    default_course_context JSONB,
    custom_templates JSONB,
    generation_settings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- Indexes for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================
-- STAGE WEIGHTS CONFIGURATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS stage_weights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_name TEXT NOT NULL UNIQUE,
    stage_order INTEGER NOT NULL,
    weight_percent INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default stage weights
INSERT INTO stage_weights (stage_name, stage_order, weight_percent, description) VALUES
    ('Initialization', 1, 2, 'Setup and validation'),
    ('CourseDetection', 2, 5, 'Detect course context from transcript'),
    ('GapAnalysis', 3, 5, 'Analyze gaps between transcript and content'),
    ('DraftCreation', 4, 40, 'Create initial content draft'),
    ('Review', 5, 15, 'Review and validate content'),
    ('Refinement', 6, 20, 'Refine and improve content'),
    ('Formatting', 7, 10, 'Format final output'),
    ('Completion', 8, 3, 'Finalization and cleanup')
ON CONFLICT (stage_name) DO NOTHING;

-- ============================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================

-- Generations table indexes
CREATE INDEX IF NOT EXISTS idx_generations_progress ON generations(progress_percent);
CREATE INDEX IF NOT EXISTS idx_generations_current_agent ON generations(current_agent);
CREATE INDEX IF NOT EXISTS idx_generations_resume_token ON generations(resume_token) WHERE resume_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generations_started_at ON generations(started_at);

-- Composite index for active generations lookup
CREATE INDEX IF NOT EXISTS idx_generations_active ON generations(user_id, status) 
    WHERE status IN ('queued', 'processing');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate progress based on stage weights
CREATE OR REPLACE FUNCTION calculate_progress(
    p_current_stage TEXT,
    p_sub_progress DECIMAL DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
    v_base_progress INTEGER;
    v_stage_weight INTEGER;
    v_calculated INTEGER;
BEGIN
    -- Get cumulative weight of completed stages
    SELECT COALESCE(SUM(weight_percent), 0)
    INTO v_base_progress
    FROM stage_weights
    WHERE stage_order < (SELECT stage_order FROM stage_weights WHERE stage_name = p_current_stage)
    AND is_active = true;

    -- Get current stage weight
    SELECT weight_percent
    INTO v_stage_weight
    FROM stage_weights
    WHERE stage_name = p_current_stage;

    -- Calculate progress
    v_calculated := v_base_progress + (v_stage_weight * p_sub_progress / 100);
    
    RETURN LEAST(v_calculated, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to update historical timing data
CREATE OR REPLACE FUNCTION update_historical_timing()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO historical_timing (stage_name, mode, avg_duration_ms, min_duration_ms, max_duration_ms, sample_count)
    SELECT 
        gm.stage_name,
        g.mode,
        EXTRACT(EPOCH FROM (gm.completed_at - gm.started_at)) * 1000,
        EXTRACT(EPOCH FROM (gm.completed_at - gm.started_at)) * 1000,
        EXTRACT(EPOCH FROM (gm.completed_at - gm.started_at)) * 1000,
        1
    FROM generation_metrics gm
    JOIN generations g ON g.id = gm.generation_id
    WHERE gm.id = NEW.id
    ON CONFLICT (stage_name, mode) DO UPDATE SET
        avg_duration_ms = (
            (historical_timing.avg_duration_ms * historical_timing.sample_count) + 
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000
        ) / (historical_timing.sample_count + 1),
        min_duration_ms = LEAST(historical_timing.min_duration_ms, EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000),
        max_duration_ms = GREATEST(historical_timing.max_duration_ms, EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000),
        sample_count = historical_timing.sample_count + 1,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user_preferences updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update stage_weights updated_at
CREATE OR REPLACE FUNCTION update_stage_weights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update historical timing when generation_metrics is updated
CREATE TRIGGER trg_update_historical_timing
    AFTER UPDATE OF completed_at ON generation_metrics
    FOR EACH ROW
    WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
    EXECUTE FUNCTION update_historical_timing();

-- Trigger for user_preferences updated_at
CREATE TRIGGER trg_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Trigger for stage_weights updated_at
CREATE TRIGGER trg_stage_weights_updated_at
    BEFORE UPDATE ON stage_weights
    FOR EACH ROW
    EXECUTE FUNCTION update_stage_weights_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE generation_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_timing ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_weights ENABLE ROW LEVEL SECURITY;

-- Generation metrics policies
CREATE POLICY "Users can view metrics of own generations"
    ON generation_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM generations 
            WHERE generations.id = generation_metrics.generation_id 
            AND generations.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all metrics"
    ON generation_metrics FOR SELECT
    USING (is_admin());

-- Historical timing policies (read-only for users, admin write)
CREATE POLICY "Users can view historical timing"
    ON historical_timing FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage historical timing"
    ON historical_timing FOR ALL
    USING (is_admin());

-- Feedback scores policies
CREATE POLICY "Users can view feedback of own generations"
    ON feedback_scores FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM generations 
            WHERE generations.id = feedback_scores.generation_id 
            AND generations.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all feedback"
    ON feedback_scores FOR SELECT
    USING (is_admin());

-- User preferences policies
CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Stage weights policies (read-only for users, admin write)
CREATE POLICY "Users can view stage weights"
    ON stage_weights FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage stage weights"
    ON stage_weights FOR ALL
    USING (is_admin());

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE generation_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;

-- ============================================
-- DEFAULT USER PREFERENCES TRIGGER
-- ============================================

-- Function to create default user preferences on profile creation
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences for existing profiles
CREATE TRIGGER trg_create_user_preferences
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_preferences();

-- Create preferences for existing users (migration safety)
INSERT INTO user_preferences (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_preferences)
ON CONFLICT (user_id) DO NOTHING;
