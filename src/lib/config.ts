/**
 * Centralized application constants.
 *
 * All magic numbers that were previously scattered across the codebase live
 * here so they can be tuned from a single location.
 */

// --- Storage ---
export const STORAGE_MAX_BYTES = 5 * 1024 * 1024;
export const STORAGE_WARN_THRESHOLD = 0.8;

// --- SSE / streaming ---
export const SSE_CHAR_BATCH = 200;
export const SSE_MAX_RETRIES = 2;
export const SSE_RETRY_DELAYS = [2000, 5000];

// --- Rate limiting ---
export const RATE_LIMIT_MINUTE = { window: 60_000, max: 10 };
export const RATE_LIMIT_HOUR = { window: 3_600_000, max: 100 };

// --- Timeouts & circuit breaker ---
export const STREAM_TIMEOUT_MS = 90_000;
export const CIRCUIT_BREAKER_WINDOW_MS = 30_000;
export const CIRCUIT_BREAKER_THRESHOLD = 5;

// --- PDF parsing ---
export const PDF_CHUNK_SIZE = 50; // pages per batch
