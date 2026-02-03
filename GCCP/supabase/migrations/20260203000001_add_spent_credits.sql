-- Add spent_credits column to profiles table
-- This tracks total spent budget independent of whether generations are deleted
-- Stored in cents like the credits column (100 = $1.00)

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS spent_credits INTEGER DEFAULT 0 NOT NULL;

-- Initialize spent_credits from existing generations for existing users
-- This ensures backward compatibility with existing data
UPDATE profiles p
SET spent_credits = COALESCE(
  (SELECT ROUND(SUM(g.estimated_cost) * 100)::INTEGER 
   FROM generations g 
   WHERE g.user_id = p.id),
  0
);

-- Add comment for documentation
COMMENT ON COLUMN profiles.spent_credits IS 'Total credits spent by user in cents (100 = $1.00). This is independent of generation deletion.';

-- Create RPC function to increment spent_credits atomically
CREATE OR REPLACE FUNCTION increment_spent_credits(user_id_param UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET spent_credits = spent_credits + amount,
      updated_at = NOW()
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_spent_credits(UUID, INTEGER) TO authenticated;
