'use client';

import { useCallback, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FAVICON_SIZE = 32;
const BADGE_RADIUS = 5;
const PULSE_INTERVAL = 600; // ms between pulse frames

// ---------------------------------------------------------------------------
// useFaviconBadge — overlays status badges on the favicon via canvas
// ---------------------------------------------------------------------------

export function useFaviconBadge() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalHrefRef = useRef<string | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkRef = useRef<HTMLLinkElement | null>(null);

  /**
   * Initialize: capture the original favicon and prepare the canvas.
   * Safely called multiple times (idempotent).
   */
  const init = useCallback(() => {
    if (typeof document === 'undefined') return;

    // Find or create the <link rel="icon"> element
    if (!linkRef.current) {
      linkRef.current =
        (document.querySelector('link[rel="icon"]') as HTMLLinkElement) ??
        (document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement);

      if (!linkRef.current) {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = '/favicon.ico';
        document.head.appendChild(link);
        linkRef.current = link;
      }
    }

    // Store original href
    if (!originalHrefRef.current) {
      originalHrefRef.current = linkRef.current.href;
    }

    // Create offscreen canvas
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = FAVICON_SIZE;
      canvasRef.current.height = FAVICON_SIZE;
    }

    // Load the original favicon image for compositing
    if (!originalImageRef.current) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = originalHrefRef.current;
      originalImageRef.current = img;
    }
  }, []);

  /** Stop any running animation interval. */
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  /** Restore the original favicon. */
  const restore = useCallback(() => {
    stopAnimation();
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }
    if (linkRef.current && originalHrefRef.current) {
      linkRef.current.href = originalHrefRef.current;
    }
  }, [stopAnimation]);

  /**
   * Draw the base favicon image onto the canvas, then return the 2D context.
   * Returns null if drawing fails.
   */
  const drawBase = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);

    // Draw original favicon (may not be loaded yet — draw anyway)
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, FAVICON_SIZE, FAVICON_SIZE);
    } else {
      // Fallback: fill with brand color
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.roundRect(0, 0, FAVICON_SIZE, FAVICON_SIZE, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('G', FAVICON_SIZE / 2, FAVICON_SIZE / 2 + 1);
    }

    return ctx;
  }, []);

  /** Apply the canvas content to the favicon link element. */
  const applyCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const link = linkRef.current;
    if (!canvas || !link) return;
    try {
      link.href = canvas.toDataURL('image/png');
    } catch {
      // canvas.toDataURL can fail with tainted canvases
    }
  }, []);

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Show a pulsing amber dot in the bottom-right corner (generation in progress). */
  const showGenerating = useCallback(() => {
    init();
    stopAnimation();
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }

    let pulse = 0;
    const draw = () => {
      const ctx = drawBase();
      if (!ctx) return;

      // Pulsing alpha between 0.6 and 1.0
      const alpha = 0.6 + 0.4 * Math.abs(Math.sin((pulse * Math.PI) / 4));
      pulse++;

      const cx = FAVICON_SIZE - BADGE_RADIUS - 1;
      const cy = FAVICON_SIZE - BADGE_RADIUS - 1;

      // White border ring
      ctx.beginPath();
      ctx.arc(cx, cy, BADGE_RADIUS + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();

      // Amber dot
      ctx.beginPath();
      ctx.arc(cx, cy, BADGE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245, 158, 11, ${alpha})`;
      ctx.fill();

      applyCanvas();
    };

    draw();
    animationRef.current = setInterval(draw, PULSE_INTERVAL);
  }, [init, stopAnimation, drawBase, applyCanvas]);

  /** Show a green checkmark badge for a duration, then revert. */
  const showComplete = useCallback(
    (durationMs = 5000) => {
      init();
      stopAnimation();
      if (revertTimerRef.current) {
        clearTimeout(revertTimerRef.current);
      }

      const ctx = drawBase();
      if (ctx) {
        const cx = FAVICON_SIZE - BADGE_RADIUS - 1;
        const cy = FAVICON_SIZE - BADGE_RADIUS - 1;

        // White border ring
        ctx.beginPath();
        ctx.arc(cx, cy, BADGE_RADIUS + 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Green circle
        ctx.beginPath();
        ctx.arc(cx, cy, BADGE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();

        // Checkmark
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 2.5, cy);
        ctx.lineTo(cx - 0.5, cy + 2.2);
        ctx.lineTo(cx + 3, cy - 2);
        ctx.stroke();

        applyCanvas();
      }

      revertTimerRef.current = setTimeout(() => {
        restore();
        revertTimerRef.current = null;
      }, durationMs);
    },
    [init, stopAnimation, drawBase, applyCanvas, restore],
  );

  /** Show a red X badge for a duration, then revert. */
  const showError = useCallback(
    (durationMs = 5000) => {
      init();
      stopAnimation();
      if (revertTimerRef.current) {
        clearTimeout(revertTimerRef.current);
      }

      const ctx = drawBase();
      if (ctx) {
        const cx = FAVICON_SIZE - BADGE_RADIUS - 1;
        const cy = FAVICON_SIZE - BADGE_RADIUS - 1;

        // White border ring
        ctx.beginPath();
        ctx.arc(cx, cy, BADGE_RADIUS + 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Red circle
        ctx.beginPath();
        ctx.arc(cx, cy, BADGE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        // X mark
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 2, cy - 2);
        ctx.lineTo(cx + 2, cy + 2);
        ctx.moveTo(cx + 2, cy - 2);
        ctx.lineTo(cx - 2, cy + 2);
        ctx.stroke();

        applyCanvas();
      }

      revertTimerRef.current = setTimeout(() => {
        restore();
        revertTimerRef.current = null;
      }, durationMs);
    },
    [init, stopAnimation, drawBase, applyCanvas, restore],
  );

  // Restore on unmount
  useEffect(() => {
    return () => {
      restore();
    };
  }, [restore]);

  return {
    showGenerating,
    showComplete,
    showError,
    restore,
  } as const;
}
