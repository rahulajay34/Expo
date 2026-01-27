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
    maxAge?: number;  // Max age in ms, default 30 minutes
    maxEntries?: number;
}

const DEFAULT_MAX_AGE = 30 * 60 * 1000; // 30 minutes
const DEFAULT_MAX_ENTRIES = 20;

// In-memory cache store
const cacheStore = new Map<string, CacheEntry<any>>();

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
        console.info('📦 Cache hit for gap analysis');
        return Promise.resolve(cached.data);
    }

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
 * Get cache stats for debugging
 */
export function getCacheStats(): { size: number; entries: string[] } {
    return {
        size: cacheStore.size,
        entries: Array.from(cacheStore.keys())
    };
}
