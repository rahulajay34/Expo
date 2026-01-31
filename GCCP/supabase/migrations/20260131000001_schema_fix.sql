-- GCCP Schema Fix Migration
-- Fixes missing columns and enum values

-- ============================================
-- FIX CONTENT_MODE ENUM - ADD 'pre-read'
-- ============================================

-- First, add the new enum value
ALTER TYPE content_mode ADD VALUE IF NOT EXISTS 'pre-read';

-- ============================================
-- ADD MISSING COLUMNS TO GENERATIONS TABLE
-- ============================================

-- Add token_count column
ALTER TABLE generations ADD COLUMN IF NOT EXISTS token_count INTEGER;

-- Add model_used column
ALTER TABLE generations ADD COLUMN IF NOT EXISTS model_used TEXT;

-- ============================================
-- UPDATE GENERATION METRICS TABLE NAME
-- ============================================

-- The migration references 'historical_timing' but types use 'historical_timing_data'
-- Let's ensure the table exists with the correct name
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'historical_timing_data') THEN
        -- Rename if exists as 'historical_timing'
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'historical_timing') THEN
            ALTER TABLE historical_timing RENAME TO historical_timing_data;
        ELSE
            -- Create the table if it doesn't exist
            CREATE TABLE historical_timing_data (
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

            -- Create indexes
            CREATE INDEX idx_historical_timing_data_stage_mode ON historical_timing_data(stage_name, mode);
            CREATE INDEX idx_historical_timing_data_updated ON historical_timing_data(last_updated);
        END IF;
    END IF;
END $$;

-- ============================================
-- FIX HISTORICAL_TIMING FUNCTION
-- ============================================

-- Update the function to use the correct table name
CREATE OR REPLACE FUNCTION update_historical_timing()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO historical_timing_data (stage_name, mode, avg_duration_ms, min_duration_ms, max_duration_ms, sample_count)
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
            (historical_timing_data.avg_duration_ms * historical_timing_data.sample_count) + 
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000
        ) / (historical_timing_data.sample_count + 1),
        min_duration_ms = LEAST(historical_timing_data.min_duration_ms, EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000),
        max_duration_ms = GREATEST(historical_timing_data.max_duration_ms, EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000),
        sample_count = historical_timing_data.sample_count + 1,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ENSURE REALTIME PUBLICATION INCLUDES ALL TABLES
-- ============================================

-- Add all tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS generations;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS generation_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS generation_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS feedback_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS user_preferences;

-- ============================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Add index for token_count
CREATE INDEX IF NOT EXISTS idx_generations_token_count ON generations(token_count) WHERE token_count IS NOT NULL;

-- Add index for model_used
CREATE INDEX IF NOT EXISTS idx_generations_model_used ON generations(model_used) WHERE model_used IS NOT NULL;

-- ============================================
-- ADD RLS POLICIES FOR NEW COLUMNS
-- ============================================

-- No new policies needed as the existing policies cover the whole table

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE 'Schema fix migration completed successfully';
    RAISE NOTICE '- Added pre-read to content_mode enum';
    RAISE NOTICE '- Added token_count and model_used columns to generations table';
    RAISE NOTICE '- Fixed historical_timing_data table reference';
    RAISE NOTICE '- Updated update_historical_timing function';
    RAISE NOTICE '- Added all tables to realtime publication';
END $$;
