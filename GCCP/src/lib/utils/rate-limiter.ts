// =============================================================================
// GCCP — In-Memory Sliding Window Rate Limiter
//
// Tracks request timestamps per key (IP address) and enforces a maximum
// number of requests within a rolling time window.
// =============================================================================

interface RateLimiterConfig {
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
  /** Time window in milliseconds. */
  windowMs: number;
}

interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Number of remaining requests in the current window. */
  remaining: number;
  /** Seconds until the oldest request expires (for Retry-After header). */
  retryAfterSeconds: number;
}

export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  /** Map of key (IP) -> sorted array of request timestamps. */
  private readonly requests = new Map<string, number[]>();
  /** Interval handle for periodic cleanup of stale entries. */
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;

    // Run cleanup every 5 minutes to prevent memory leaks from stale IPs
    this.cleanupInterval = setInterval(() => this.pruneAll(), 5 * 60 * 1000);

    // Allow the timer to not prevent Node from exiting
    if (this.cleanupInterval && typeof this.cleanupInterval === 'object' && 'unref' in this.cleanupInterval) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Check whether a request from the given key is allowed, and if so,
   * record the request timestamp.
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing timestamps and prune expired ones
    let timestamps = this.requests.get(key) ?? [];
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      // Rate limit exceeded — calculate how long until the oldest request expires
      const oldestTimestamp = timestamps[0];
      const retryAfterMs = oldestTimestamp + this.windowMs - now;
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

      // Save pruned timestamps back
      this.requests.set(key, timestamps);

      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }

    // Request allowed — record it
    timestamps.push(now);
    this.requests.set(key, timestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Remove all expired entries from the map to prevent memory growth.
   */
  private pruneAll(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, valid);
      }
    }
  }

  /**
   * Clean up the interval timer. Call this if the rate limiter is no longer
   * needed (e.g. in tests).
   */
  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
