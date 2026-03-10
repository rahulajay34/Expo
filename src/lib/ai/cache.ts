// =============================================================================
// GCCP — In-Memory Generation Cache
// Exact-match cache based on input hash to avoid redundant API calls.
// Cache entries expire after 30 minutes (TTL).
// =============================================================================

/** Shape of a cached entry. */
interface CacheEntry {
  content: string;
  timestamp: number;
}

/** TTL in milliseconds — 30 minutes. */
const CACHE_TTL = 30 * 60 * 1000;

/** In-memory cache store. Lives for the duration of the server process. */
const cache = new Map<string, CacheEntry>();

/**
 * Generates a deterministic cache key from the generation inputs.
 * Normalises topic and subtopics (lowercase, trimmed, sorted) so that
 * cosmetically different but semantically identical requests share a key.
 */
export function getCacheKey(
  topic: string,
  subtopics: string[],
  contentType: string,
): string {
  return JSON.stringify({
    topic: topic.toLowerCase().trim(),
    subtopics: subtopics
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean)
      .sort(),
    contentType,
  });
}

/**
 * Retrieves a cached result for the given key.
 * Returns `null` if the key is not found or the entry has expired.
 * Expired entries are eagerly evicted.
 */
export function getFromCache(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.content;
  }

  // Entry has expired — evict it.
  cache.delete(key);
  return null;
}

/**
 * Stores a generation result in the cache.
 */
export function setCache(key: string, content: string): void {
  cache.set(key, { content, timestamp: Date.now() });
}

/**
 * Clears the entire cache. Useful for testing or manual reset.
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Returns current cache statistics (for the metrics dashboard).
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
