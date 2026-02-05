-- Add cost_details column to generations table to track granular cost breakdown
ALTER TABLE generations ADD COLUMN IF NOT EXISTS cost_details JSONB;

-- Comment on column
COMMENT ON COLUMN generations.cost_details IS 'Detailed breakdown of generation costs including input, output, and images';
