-- Check current publication tables
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Add missing tables to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS generations;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS generation_logs;

-- Note: RLS policies should already be in place from previous migrations
-- Generations: user should see their own generations
-- Generation_logs: user should see logs for their generations
