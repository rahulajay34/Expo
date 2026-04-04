'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMotionValue, useTransform, MotionValue } from 'framer-motion';

interface ScrollHeaderResult {
  /** Whether the header is past the threshold and should show the compact bar */
  isCompact: boolean;
  /** The current scroll position as a motion value (for parallax transforms) */
  scrollY: MotionValue<number>;
  /** Parallax transform for the title (0.7x scroll speed) */
  titleY: MotionValue<number>;
  /** Parallax transform for subtitle/stats (0.85x scroll speed) */
  subtitleY: MotionValue<number>;
  /** Opacity that fades to 0 as user scrolls past the header */
  headerOpacity: MotionValue<number>;
  /** Ref callback to attach to the scroll container element */
  scrollRef: (node: HTMLElement | null) => void;
}

/**
 * Hook for parallax depth headers and sticky compressed headers.
 *
 * Tracks scroll position on a specific container element (not window)
 * and provides Framer Motion values for parallax transforms and
 * a boolean for when the compact sticky header should appear.
 *
 * @param threshold Scroll distance (px) at which the compact header appears. Default: 200.
 * @param prefersReducedMotion If true, parallax values remain 0 (no motion).
 */
export function useScrollHeader(
  threshold: number = 200,
  prefersReducedMotion: boolean = false,
): ScrollHeaderResult {
  const [isCompact, setIsCompact] = useState(false);
  const scrollY = useMotionValue(0);
  const scrollNodeRef = useRef<HTMLElement | null>(null);

  // Parallax transforms: title moves slower (0.7x), subtitle at 0.85x
  // When reduced motion is preferred, output range is [0, 0] (no movement)
  const titleY = useTransform(
    scrollY,
    [0, threshold],
    prefersReducedMotion ? [0, 0] : [0, -threshold * 0.3],
  );
  const subtitleY = useTransform(
    scrollY,
    [0, threshold],
    prefersReducedMotion ? [0, 0] : [0, -threshold * 0.15],
  );
  const headerOpacity = useTransform(scrollY, [0, threshold * 0.75], [1, 0]);

  const handleScroll = useCallback(() => {
    const node = scrollNodeRef.current;
    if (!node) return;
    const y = node.scrollTop;
    scrollY.set(y);
    setIsCompact(y > threshold);
  }, [threshold, scrollY]);

  const scrollRef = useCallback(
    (node: HTMLElement | null) => {
      // Detach old listener
      if (scrollNodeRef.current) {
        scrollNodeRef.current.removeEventListener('scroll', handleScroll);
      }
      scrollNodeRef.current = node;
      // Attach new listener
      if (node) {
        node.addEventListener('scroll', handleScroll, { passive: true });
        // Read initial position
        handleScroll();
      }
    },
    [handleScroll],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollNodeRef.current) {
        scrollNodeRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  return {
    isCompact,
    scrollY,
    titleY,
    subtitleY,
    headerOpacity,
    scrollRef,
  };
}
