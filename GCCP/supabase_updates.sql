-- SQL updates for GCCP v3 Migration

-- Function to safely increment spent credits from server-side logic
-- Only needed if not already present or if signature mismatches.
CREATE OR REPLACE FUNCTION increment_spent_credits(user_id_param uuid, amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET spent_credits = COALESCE(spent_credits, 0) + amount
  WHERE id = user_id_param;
END;
$$;

-- Ensure generation_logs log_type allows 'step'
ALTER TYPE log_type ADD VALUE IF NOT EXISTS 'step';
