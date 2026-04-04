/**
 * Token Rate Tracker — Adaptive-Speed Streaming Text Fade-In
 *
 * Tracks the rate of incoming streamed characters using a sliding window,
 * then maps that rate to a CSS animation duration. Faster streams get
 * shorter (snappier) fade-in durations; slower streams get longer
 * (gentler) durations.
 *
 * Usage:
 *   const tracker = new StreamSpeedTracker();
 *   // On each chunk:
 *   tracker.recordChunk(chunk.length);
 *   const durationMs = tracker.getAnimationDuration();
 */

interface ChunkRecord {
  timestamp: number;
  charCount: number;
}

/** Clamp a value between min and max. */
function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation from a to b by factor t ∈ [0, 1]. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class StreamSpeedTracker {
  /** Sliding window of recent chunks (kept to last ~2 seconds). */
  private chunks: ChunkRecord[] = [];

  /** Smoothed animation duration (ms) — avoids abrupt jumps. */
  private smoothedDuration = 150;

  /** Exponential smoothing factor (0–1). Lower = smoother transitions. */
  private readonly smoothingAlpha = 0.3;

  /** Window size in ms to consider for rate calculation. */
  private readonly windowMs = 2000;

  /** Rate thresholds (chars/sec) that map to animation duration bounds. */
  private readonly rateMin = 10; // slow stream
  private readonly rateMax = 80; // fast stream

  /** Duration bounds (ms). */
  private readonly durationSlow = 200; // gentle fade for slow streams
  private readonly durationFast = 80; // snappy fade for fast streams

  /** Record an incoming chunk of `charCount` characters. */
  recordChunk(charCount: number): void {
    const now = performance.now();
    this.chunks.push({ timestamp: now, charCount });
    this.pruneWindow(now);
    this.updateSmoothedDuration();
  }

  /** Get the current smoothed animation duration in milliseconds. */
  getAnimationDuration(): number {
    return Math.round(this.smoothedDuration);
  }

  /** Get the current chars/sec rate (for debugging / display). */
  getCurrentRate(): number {
    const now = performance.now();
    this.pruneWindow(now);
    return this.computeRate(now);
  }

  /** Reset tracker state (call when streaming starts or ends). */
  reset(): void {
    this.chunks = [];
    this.smoothedDuration = 150;
  }

  /** Remove chunks older than the sliding window. */
  private pruneWindow(now: number): void {
    const cutoff = now - this.windowMs;
    // Find first chunk within window
    let i = 0;
    while (i < this.chunks.length && this.chunks[i].timestamp < cutoff) {
      i++;
    }
    if (i > 0) {
      this.chunks = this.chunks.slice(i);
    }
  }

  /** Compute current chars/sec from the sliding window. */
  private computeRate(now: number): number {
    if (this.chunks.length < 2) return 0;

    const oldest = this.chunks[0].timestamp;
    const elapsed = (now - oldest) / 1000; // seconds
    if (elapsed < 0.05) return 0; // avoid division by tiny numbers

    const totalChars = this.chunks.reduce((sum, c) => sum + c.charCount, 0);
    return totalChars / elapsed;
  }

  /** Map rate to duration and apply exponential smoothing. */
  private updateSmoothedDuration(): void {
    const now = performance.now();
    const rate = this.computeRate(now);

    // Map rate to duration via clamped lerp
    // Higher rate → lower duration (faster animation to keep up)
    const t = clamp(0, 1, (rate - this.rateMin) / (this.rateMax - this.rateMin));
    const rawDuration = lerp(this.durationSlow, this.durationFast, t);

    // Exponential smoothing to avoid abrupt jumps
    this.smoothedDuration =
      this.smoothingAlpha * rawDuration +
      (1 - this.smoothingAlpha) * this.smoothedDuration;
  }
}
