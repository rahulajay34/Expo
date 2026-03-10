// =============================================================================
// GCCP — Retry Utility for Gemini API Calls
// Implements exponential backoff with abort signal support.
// =============================================================================

/** Retry delays in milliseconds for attempts 1, 2, and 3. */
const RETRY_DELAYS = [10_000, 20_000, 30_000] as const;

/** Maximum number of retry attempts. */
export const MAX_RETRY_ATTEMPTS = RETRY_DELAYS.length;

/** Information emitted when a retry is about to happen. */
export interface RetryInfo {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  error: string;
}

/**
 * Determines whether an error from the Gemini API is retryable.
 *
 * Retryable: 429 (rate limit), 503 (server unavailable), network/timeout errors.
 * Non-retryable: 400 (bad request), 401/403 (auth), content safety blocks, abort.
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return false;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Non-retryable: auth errors
    if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden')) {
      return false;
    }

    // Non-retryable: bad request
    if (msg.includes('400') || msg.includes('bad request') || msg.includes('invalid')) {
      return false;
    }

    // Non-retryable: content safety / blocked
    if (
      msg.includes('safety') ||
      msg.includes('blocked') ||
      msg.includes('harm') ||
      msg.includes('content filter') ||
      msg.includes('finish_reason') ||
      msg.includes('recitation')
    ) {
      return false;
    }

    // Retryable: rate limit
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota') || msg.includes('resource exhausted')) {
      return true;
    }

    // Retryable: server errors
    if (msg.includes('503') || msg.includes('500') || msg.includes('502') || msg.includes('server') || msg.includes('unavailable')) {
      return true;
    }

    // Retryable: network/timeout errors
    if (
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('network') ||
      msg.includes('econnreset') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('fetch failed') ||
      msg.includes('socket')
    ) {
      return true;
    }
  }

  // Default: do not retry unknown errors
  return false;
}

/**
 * Sleeps for the specified duration, but resolves immediately if the abort
 * signal fires. Returns `true` if the sleep completed normally, `false` if
 * it was aborted.
 */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      resolve(false);
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Wraps an async function with retry logic using exponential backoff.
 *
 * - Up to 3 retries with delays of 10s, 20s, 30s.
 * - Only retries on retryable errors (429, 503, network/timeout).
 * - Respects AbortSignal: if aborted during a retry wait, stops immediately.
 * - Calls `onRetry` before each retry attempt so the pipeline can emit events.
 *
 * @param fn - The async function to execute (and potentially retry).
 * @param signal - Optional AbortSignal to cancel retries.
 * @param onRetry - Optional callback invoked before each retry attempt.
 * @returns The result of `fn` on success.
 * @throws The last error if all retries are exhausted or the error is not retryable.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal,
  onRetry?: (info: RetryInfo) => void,
): Promise<T> {
  let lastError: unknown;

  // Attempt 0 is the initial call, attempts 1-3 are retries
  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // If aborted, propagate immediately
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      // If not retryable or we've used all retries, throw
      if (!isRetryableError(error) || attempt >= MAX_RETRY_ATTEMPTS) {
        throw error;
      }

      // Calculate delay for this retry
      const delayMs = RETRY_DELAYS[attempt];
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Notify the caller that we're about to retry
      onRetry?.({
        attempt: attempt + 1,
        maxAttempts: MAX_RETRY_ATTEMPTS,
        delayMs,
        error: errorMessage,
      });

      // Wait with abort support
      const completed = await abortableSleep(delayMs, signal);
      if (!completed) {
        // Abort was signalled during the wait
        throw new DOMException('Pipeline aborted by user.', 'AbortError');
      }
    }
  }

  // Should not reach here, but just in case
  throw lastError;
}
