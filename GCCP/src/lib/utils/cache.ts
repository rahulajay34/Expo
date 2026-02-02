/**
 * Smart Caching Utility
 * Caches expensive operations like gap analysis using content hashes
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    hash: string;
}

interface CacheOptions {
    maxAge?: number;  // Max age in ms, default 2 hours
    maxEntries?: number;
}

// Increased from 30 min to 2 hours - educational content is stable
// Per agentic AI framework: low-volatility data benefits from higher TTLs
const DEFAULT_MAX_AGE = 2 * 60 * 60 * 1000; // 2 hours
const DEFAULT_MAX_ENTRIES = 50; // Increased for better hit rates

// In-memory cache store
const cacheStore = new Map<string, CacheEntry<any>>();

// Cache hit/miss tracking for optimization metrics
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Generate a simple hash from a string
 * Not cryptographic, just for cache key comparison
 */
export function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Cache wrapper for gap analysis
 */
export function cacheGapAnalysis<T>(
    key: string,
    transcript: string,
    subtopics: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
): Promise<T> {
    const maxAge = options.maxAge || DEFAULT_MAX_AGE;

    // Create a hash of the inputs
    const inputHash = simpleHash(`${transcript.slice(0, 5000)}|${subtopics}`);
    const cacheKey = `gap:${key}:${inputHash}`;

    // Check cache
    const cached = cacheStore.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < maxAge) {
        cacheHits++;
        console.info(`📦 Cache hit for gap analysis (hit rate: ${getCacheHitRate()}%)`);
        return Promise.resolve(cached.data);
    }

    cacheMisses++;
    // Fetch and cache
    return fetcher().then(data => {
        cacheStore.set(cacheKey, {
            data,
            timestamp: Date.now(),
            hash: inputHash
        });

        // Prune old entries
        pruneCache(options.maxEntries || DEFAULT_MAX_ENTRIES);

        console.info('📦 Cached gap analysis result');
        return data;
    });
}

/**
 * Generic cache get/set
 */
export const cache = {
    get<T>(key: string): T | null {
        const entry = cacheStore.get(key);
        if (!entry) return null;

        // Check expiry (default 30 min)
        if (Date.now() - entry.timestamp > DEFAULT_MAX_AGE) {
            cacheStore.delete(key);
            return null;
        }

        return entry.data as T;
    },

    set<T>(key: string, data: T, hash?: string): void {
        cacheStore.set(key, {
            data,
            timestamp: Date.now(),
            hash: hash || ''
        });
        pruneCache(DEFAULT_MAX_ENTRIES);
    },

    has(key: string): boolean {
        return cacheStore.has(key);
    },

    delete(key: string): boolean {
        return cacheStore.delete(key);
    },

    clear(): void {
        cacheStore.clear();
    },

    size(): number {
        return cacheStore.size;
    }
};

/**
 * Remove oldest entries when cache exceeds max size
 */
function pruneCache(maxEntries: number): void {
    if (cacheStore.size <= maxEntries) return;

    // Sort by timestamp and remove oldest
    const entries = Array.from(cacheStore.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, entries.length - maxEntries);
    toRemove.forEach(([key]) => cacheStore.delete(key));
}

/**
 * Calculate cache hit rate percentage
 * Per agentic AI framework: target >25% for cost optimization
 * Break-even at 2.5% (embedding cost vs LLM cost)
 */
export function getCacheHitRate(): string {
    const total = cacheHits + cacheMisses;
    if (total === 0) return '0.0';
    return ((cacheHits / total) * 100).toFixed(1);
}

/**
 * Get cache stats for debugging and monitoring
 * Includes hit rate metrics per agentic AI cost optimization guidelines
 */
export function getCacheStats(): { 
    size: number; 
    entries: string[]; 
    hits: number; 
    misses: number; 
    hitRate: string;
} {
    return {
        size: cacheStore.size,
        entries: Array.from(cacheStore.keys()),
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: getCacheHitRate()
    };
}
