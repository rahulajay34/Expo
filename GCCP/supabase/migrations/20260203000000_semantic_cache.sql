-- Semantic Caching with pgvector
-- Per Agentic AI Framework: 2.5% cache hit rate breaks even on embedding costs
-- Embeddings are 750x cheaper than LLM calls

-- Enable pgvector extension (requires superuser or extension already available)
CREATE EXTENSION IF NOT EXISTS vector;

-- Semantic cache table for storing embeddings and cached data
CREATE TABLE IF NOT EXISTS semantic_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Namespace for different cache types (gap-analysis, course-context, etc.)
  namespace TEXT NOT NULL,
  
  -- The embedding vector (using 128 dimensions for simple embeddings)
  -- For production with OpenAI embeddings, use 1536 dimensions
  embedding vector(128),
  
  -- Cached data stored as JSONB for flexibility
  data JSONB NOT NULL,
  
  -- Original query hash for exact match fallback
  query_hash TEXT NOT NULL,
  
  -- Query text for debugging (truncated)
  query_preview TEXT,
  
  -- TTL and lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Analytics
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- User association (optional, for per-user caching)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create HNSW index for fast approximate nearest neighbor search
-- HNSW provides O(log n) query time with high recall
CREATE INDEX IF NOT EXISTS semantic_cache_embedding_idx 
  ON semantic_cache 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index for namespace + expiry queries
CREATE INDEX IF NOT EXISTS semantic_cache_namespace_expires_idx 
  ON semantic_cache (namespace, expires_at);

-- Index for query hash (exact match fallback)
CREATE INDEX IF NOT EXISTS semantic_cache_query_hash_idx 
  ON semantic_cache (query_hash);

-- Function to find semantically similar cache entries
CREATE OR REPLACE FUNCTION match_semantic_cache(
  p_namespace TEXT,
  p_query_embedding vector(128),
  p_similarity_threshold FLOAT DEFAULT 0.85,
  p_match_count INT DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  data JSONB,
  similarity FLOAT,
  hit_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.data,
    (1 - (sc.embedding <=> p_query_embedding))::FLOAT AS similarity,
    sc.hit_count
  FROM semantic_cache sc
  WHERE 
    sc.namespace = p_namespace
    AND sc.expires_at > NOW()
    AND (1 - (sc.embedding <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY sc.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- Function to increment hit count and update last accessed
CREATE OR REPLACE FUNCTION increment_cache_hit(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE semantic_cache
  SET 
    hit_count = hit_count + 1,
    last_accessed_at = NOW()
  WHERE id = p_id;
END;
$$;

-- Function to upsert cache entry
CREATE OR REPLACE FUNCTION upsert_semantic_cache(
  p_namespace TEXT,
  p_embedding vector(128),
  p_data JSONB,
  p_query_hash TEXT,
  p_query_preview TEXT,
  p_ttl_seconds INTEGER DEFAULT 7200, -- 2 hours default
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Check if exact hash match exists
  SELECT id INTO v_id
  FROM semantic_cache
  WHERE namespace = p_namespace AND query_hash = p_query_hash;
  
  IF v_id IS NOT NULL THEN
    -- Update existing entry
    UPDATE semantic_cache
    SET 
      embedding = p_embedding,
      data = p_data,
      expires_at = NOW() + (p_ttl_seconds || ' seconds')::INTERVAL,
      last_accessed_at = NOW()
    WHERE id = v_id;
    
    RETURN v_id;
  ELSE
    -- Insert new entry
    INSERT INTO semantic_cache (
      namespace, embedding, data, query_hash, query_preview, 
      expires_at, user_id
    )
    VALUES (
      p_namespace, p_embedding, p_data, p_query_hash, p_query_preview,
      NOW() + (p_ttl_seconds || ' seconds')::INTERVAL, p_user_id
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
  END IF;
END;
$$;

-- Function to clean up expired entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_semantic_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM semantic_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Create a scheduled job to cleanup expired cache (if pg_cron is available)
-- SELECT cron.schedule('cleanup-semantic-cache', '0 * * * *', 'SELECT cleanup_semantic_cache()');

-- RLS policies for semantic cache
ALTER TABLE semantic_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all cache entries (cache is shared for efficiency)
CREATE POLICY "semantic_cache_read_policy" ON semantic_cache
  FOR SELECT
  USING (true);

-- Policy: Service role can insert/update/delete
CREATE POLICY "semantic_cache_service_policy" ON semantic_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Users can manage their own cache entries
CREATE POLICY "semantic_cache_user_policy" ON semantic_cache
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON semantic_cache TO authenticated;
GRANT EXECUTE ON FUNCTION match_semantic_cache TO authenticated;
GRANT EXECUTE ON FUNCTION increment_cache_hit TO authenticated;

-- Add cache metrics view
CREATE OR REPLACE VIEW semantic_cache_metrics AS
SELECT 
  namespace,
  COUNT(*) as total_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits_per_entry,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries,
  MAX(last_accessed_at) as last_activity
FROM semantic_cache
GROUP BY namespace;

GRANT SELECT ON semantic_cache_metrics TO authenticated;

COMMENT ON TABLE semantic_cache IS 'Semantic caching layer for agentic AI workflows - stores embeddings for similarity-based cache lookups';
COMMENT ON FUNCTION match_semantic_cache IS 'Find semantically similar cached entries using vector cosine similarity';
