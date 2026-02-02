/**
 * Semantic Caching Layer for Agentic AI Workflows
 * 
 * Per the Agentic AI Framework:
 * - 2.5% cache hit rate breaks even on embedding costs
 * - Semantic similarity catches paraphrased queries that exact matching misses
 * - 750x cheaper to generate embeddings than LLM calls
 * 
 * Uses cosine similarity with configurable thresholds per data volatility.
 */

import { simpleHash } from './cache';

// TTL presets based on data volatility (per framework guidelines)
export const VOLATILITY_TTL = {
  high: 5 * 60 * 1000,       // 5 min - real-time data, frequently changing
  medium: 30 * 60 * 1000,    // 30 min - session-scoped data
  low: 2 * 60 * 60 * 1000,   // 2 hours - stable educational content
  static: 24 * 60 * 60 * 1000, // 24 hours - rarely changing reference data
};

export type DataVolatility = keyof typeof VOLATILITY_TTL;

interface SemanticCacheEntry<T> {
  id: string;
  embedding: number[];
  data: T;
  queryHash: string;
  createdAt: number;
  ttlMs: number;
  hitCount: number;
  lastAccessedAt: number;
}

interface SemanticCacheConfig {
  similarityThreshold: number;  // 0.85-0.95 recommended
  volatility: DataVolatility;
  maxEntries: number;
  embeddingDimension: number;
}

// In-memory semantic cache store
const semanticCacheStore = new Map<string, SemanticCacheEntry<any>>();

// Metrics tracking
let semanticCacheHits = 0;
let semanticCacheMisses = 0;
let totalSimilaritySearches = 0;

/**
 * Simple embedding generation using character/word statistics
 * For production, replace with OpenAI text-embedding-3-small or local model
 * This provides a fast, zero-cost fallback for development
 */
export function generateSimpleEmbedding(text: string, dimension: number = 128): number[] {
  const normalized = text.toLowerCase().slice(0, 10000);
  const embedding: number[] = new Array(dimension).fill(0);
  
  // Character frequency features
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const idx = charCode % dimension;
    embedding[idx] += 1;
  }
  
  // Word-level features
  const words = normalized.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordHash = simpleHash(word);
    const idx = parseInt(wordHash, 36) % dimension;
    embedding[idx] += 2; // Words weighted more than chars
  }
  
  // Bigram features for context
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i] + ' ' + words[i + 1];
    const bigramHash = simpleHash(bigram);
    const idx = parseInt(bigramHash, 36) % dimension;
    embedding[idx] += 3; // Bigrams weighted most
  }
  
  // L2 normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

/**
 * Semantic Cache class for intelligent query matching
 */
export class SemanticCache<T> {
  private namespace: string;
  private config: SemanticCacheConfig;

  constructor(namespace: string, config: Partial<SemanticCacheConfig> = {}) {
    this.namespace = namespace;
    this.config = {
      similarityThreshold: config.similarityThreshold ?? 0.85,
      volatility: config.volatility ?? 'low',
      maxEntries: config.maxEntries ?? 100,
      embeddingDimension: config.embeddingDimension ?? 128,
    };
  }

  /**
   * Get cached data if semantically similar query exists
   */
  get(query: string): T | null {
    totalSimilaritySearches++;
    const queryEmbedding = generateSimpleEmbedding(query, this.config.embeddingDimension);
    const ttl = VOLATILITY_TTL[this.config.volatility];
    const now = Date.now();

    let bestMatch: { entry: SemanticCacheEntry<T>; similarity: number } | null = null;

    for (const [key, entry] of semanticCacheStore.entries()) {
      if (!key.startsWith(this.namespace + ':')) continue;
      
      // Check TTL
      if (now - entry.createdAt > entry.ttlMs) {
        semanticCacheStore.delete(key);
        continue;
      }

      const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
      
      if (similarity >= this.config.similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { entry, similarity };
        }
      }
    }

    if (bestMatch) {
      semanticCacheHits++;
      bestMatch.entry.hitCount++;
      bestMatch.entry.lastAccessedAt = now;
      console.info(`🧠 Semantic cache hit (similarity: ${bestMatch.similarity.toFixed(3)}, hits: ${bestMatch.entry.hitCount})`);
      return bestMatch.entry.data;
    }

    semanticCacheMisses++;
    return null;
  }

  /**
   * Store data with semantic embedding
   */
  set(query: string, data: T): void {
    const embedding = generateSimpleEmbedding(query, this.config.embeddingDimension);
    const queryHash = simpleHash(query);
    const key = `${this.namespace}:${queryHash}`;
    const now = Date.now();

    const entry: SemanticCacheEntry<T> = {
      id: key,
      embedding,
      data,
      queryHash,
      createdAt: now,
      ttlMs: VOLATILITY_TTL[this.config.volatility],
      hitCount: 0,
      lastAccessedAt: now,
    };

    semanticCacheStore.set(key, entry);
    this.pruneIfNeeded();
    
    console.info(`🧠 Semantic cache stored (namespace: ${this.namespace}, entries: ${this.size()})`);
  }

  /**
   * Check if similar query exists without retrieving
   */
  has(query: string): boolean {
    return this.get(query) !== null;
  }

  /**
   * Remove expired and excess entries
   */
  private pruneIfNeeded(): void {
    const now = Date.now();
    const entries: Array<[string, SemanticCacheEntry<any>]> = [];

    for (const [key, entry] of semanticCacheStore.entries()) {
      if (!key.startsWith(this.namespace + ':')) continue;
      
      // Remove expired
      if (now - entry.createdAt > entry.ttlMs) {
        semanticCacheStore.delete(key);
        continue;
      }
      
      entries.push([key, entry]);
    }

    // Remove oldest if over limit (LRU based on lastAccessedAt)
    if (entries.length > this.config.maxEntries) {
      entries.sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
      const toRemove = entries.slice(0, entries.length - this.config.maxEntries);
      for (const [key] of toRemove) {
        semanticCacheStore.delete(key);
      }
    }
  }

  /**
   * Get number of entries in this namespace
   */
  size(): number {
    let count = 0;
    for (const key of semanticCacheStore.keys()) {
      if (key.startsWith(this.namespace + ':')) count++;
    }
    return count;
  }

  /**
   * Clear all entries in this namespace
   */
  clear(): void {
    for (const key of Array.from(semanticCacheStore.keys())) {
      if (key.startsWith(this.namespace + ':')) {
        semanticCacheStore.delete(key);
      }
    }
  }
}

/**
 * Get semantic cache metrics
 */
export function getSemanticCacheStats(): {
  hits: number;
  misses: number;
  hitRate: string;
  totalSearches: number;
  totalEntries: number;
  entriesByNamespace: Record<string, number>;
} {
  const total = semanticCacheHits + semanticCacheMisses;
  const hitRate = total > 0 ? ((semanticCacheHits / total) * 100).toFixed(1) : '0.0';

  // Count by namespace
  const entriesByNamespace: Record<string, number> = {};
  for (const key of semanticCacheStore.keys()) {
    const namespace = key.split(':')[0];
    entriesByNamespace[namespace] = (entriesByNamespace[namespace] || 0) + 1;
  }

  return {
    hits: semanticCacheHits,
    misses: semanticCacheMisses,
    hitRate,
    totalSearches: totalSimilaritySearches,
    totalEntries: semanticCacheStore.size,
    entriesByNamespace,
  };
}

/**
 * Reset semantic cache metrics (useful for testing)
 */
export function resetSemanticCacheMetrics(): void {
  semanticCacheHits = 0;
  semanticCacheMisses = 0;
  totalSimilaritySearches = 0;
}

/**
 * Pre-configured semantic caches for different use cases
 */
export const SemanticCaches = {
  /** For gap analysis results - stable, reusable across similar transcripts */
  gapAnalysis: new SemanticCache<any>('gap-analysis', {
    similarityThreshold: 0.88,
    volatility: 'low',
    maxEntries: 50,
  }),

  /** For course context detection - very stable */
  courseContext: new SemanticCache<any>('course-context', {
    similarityThreshold: 0.90,
    volatility: 'static',
    maxEntries: 100,
  }),

  /** For content generation - moderate similarity for creative tasks */
  contentGeneration: new SemanticCache<any>('content-gen', {
    similarityThreshold: 0.92,
    volatility: 'low',
    maxEntries: 30,
  }),

  /** For formatting results - high similarity for structured outputs */
  formatting: new SemanticCache<any>('formatting', {
    similarityThreshold: 0.95,
    volatility: 'medium',
    maxEntries: 50,
  }),
};
