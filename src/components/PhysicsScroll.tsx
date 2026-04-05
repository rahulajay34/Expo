'use client';

import { useRef, type ReactNode } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';
import { springScroll } from '@/lib/motion';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────── */

/** A ref that may hold an HTMLElement — compatible with both React 18 and 19 ref types */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScrollContainerRef = React.RefObject<any>;

interface PhysicsScrollProps {
  children: ReactNode;
  className?: string;
  /** Enable parallax depth layer separation */
  parallaxLayers?: boolean;
}

/**
 * Parallax speed multipliers per depth layer.
 * Layer 0 (background): 0.3x  — drifts slowly behind
 * Layer 1 (decoration):  0.5x  — ambient elements
 * Layer 2 (content):     1.0x  — normal scroll (default)
 * Layer 3 (floating):    1.05x — very subtle "above" feel
 */
const PARALLAX = {
  background: 0.3,
  decoration: 0.5,
  content: 1.0,
  floating: 1.05,
} as const;

/** Halve parallax offsets on mobile for subtlety */
const MOBILE_FACTOR = 0.5;

/* ── Hook: useParallaxLayers ───────────────────────────────── */

export interface ParallaxValues {
  /** Transform for background layer (0.3x speed) */
  backgroundY: MotionValue<number>;
  /** Transform for decoration layer (0.5x speed) */
  decorationY: MotionValue<number>;
  /** Transform for floating layer (1.05x speed) */
  floatingY: MotionValue<number>;
  /** Raw scroll pixel offset from container */
  scrollY: MotionValue<number>;
}

/**
 * Derive parallax transforms from a scroll container ref.
 * Returns motion values for each depth layer.
 * Returns identity (0) values when reduced motion is preferred.
 */
export function useParallaxLayers(
  containerRef: ScrollContainerRef,
  enabled = true,
): ParallaxValues {
  const prefersReducedMotion = useReducedMotion();
  const isDisabled = !enabled || !!prefersReducedMotion;

  const { scrollY } = useScroll({
    container: containerRef,
  });

  // Determine mobile vs desktop multiplier
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const factor = isMobile ? MOBILE_FACTOR : 1;

  // Each layer's offset = scrollPixels * (1 - layerSpeed) * factor
  // Background: scroll * (1 - 0.3) * factor = scroll * 0.7 * factor → moves DOWN relative to content
  // But we want background to lag, so we negate: -(scroll * (1 - speed) * factor)
  // Actually: layerY = -scrollY * speed, but since content is at 1x (natural),
  // we express the *difference* from normal scroll.
  // For a fixed-position overlay parallax approach:
  //   layerTranslateY = scrollY * (1 - speed) * factor
  // This makes slower layers appear to move UP less (lagging behind).

  const backgroundY = useTransform(
    scrollY,
    (v) => (isDisabled ? 0 : v * (1 - PARALLAX.background) * factor),
  );
  const decorationY = useTransform(
    scrollY,
    (v) => (isDisabled ? 0 : v * (1 - PARALLAX.decoration) * factor),
  );
  const floatingY = useTransform(
    scrollY,
    (v) => (isDisabled ? 0 : v * -(PARALLAX.floating - 1) * factor),
  );

  return { backgroundY, decorationY, floatingY, scrollY };
}

/* ── Hook: useCardParallax ─────────────────────────────────── */

/**
 * Per-card parallax for settings-style stacked cards.
 * Each card receives a tiny unique depth offset based on its index,
 * creating a "floating at slightly different depths" effect.
 */
export function useCardParallax(
  containerRef: ScrollContainerRef,
  cardRef: ScrollContainerRef,
  index: number,
) {
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    container: containerRef,
    target: cardRef,
    offset: ['start end', 'end start'],
  });

  // Alternate direction and scale offset by index for variety
  const direction = index % 2 === 0 ? 1 : -1;
  const magnitude = 6 + (index % 3) * 4; // 6px, 10px, 14px

  const y = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    prefersReducedMotion ? [0, 0, 0] : [magnitude * direction, 0, -magnitude * direction],
  );

  return { y };
}

/* ── Hook: useHeaderParallax ───────────────────────────────── */

/**
 * Subtle "title recedes" effect for content detail views.
 * The header moves at 0.95x scroll speed — barely perceptible
 * but creates depth separation from body content.
 */
export function useHeaderParallax(
  containerRef: ScrollContainerRef,
) {
  const prefersReducedMotion = useReducedMotion();

  const { scrollY } = useScroll({
    container: containerRef,
  });

  const headerY = useTransform(
    scrollY,
    (v) => (prefersReducedMotion ? 0 : v * 0.05), // 5% slower = recedes
  );

  return { headerY };
}

/* ── Component: PhysicsScroll ──────────────────────────────── */

/**
 * Scroll container with spring-damped momentum scrolling.
 *
 * Renders native-scrolling outer div + spring-smoothed inner motion.div.
 * The outer container handles native scroll events (keyboard, find, focus),
 * and the inner div follows with physics-based spring smoothing.
 *
 * When `prefers-reduced-motion` is active, the spring is bypassed and
 * content scrolls natively without any transform.
 */
export function PhysicsScroll({
  children,
  className,
}: PhysicsScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollY } = useScroll({
    container: containerRef,
  });

  // Spring-smoothed scroll position
  const smoothY = useSpring(scrollY, {
    ...springScroll,
    restDelta: 0.5,
    restSpeed: 0.5,
  });

  // Offset = difference between spring position and actual scroll
  // This creates the momentum overshoot effect
  const offsetY = useTransform(
    [smoothY, scrollY] as MotionValue[],
    ([smooth, actual]: number[]) =>
      prefersReducedMotion ? 0 : -(smooth - actual),
  );

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
    >
      <motion.div
        style={{
          y: offsetY,
          willChange: prefersReducedMotion ? 'auto' : 'transform',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Convenience ref accessor — pages that need to pass the scroll container
 * to useParallaxLayers can use this wrapper that exposes the ref.
 */
export function PhysicsScrollWithRef({
  children,
  className,
  scrollRef,
}: PhysicsScrollProps & {
  scrollRef: ScrollContainerRef;
}) {
  const prefersReducedMotion = useReducedMotion();

  const { scrollY } = useScroll({
    container: scrollRef,
  });

  const smoothY = useSpring(scrollY, {
    ...springScroll,
    restDelta: 0.5,
    restSpeed: 0.5,
  });

  const offsetY = useTransform(
    [smoothY, scrollY] as MotionValue[],
    ([smooth, actual]: number[]) =>
      prefersReducedMotion ? 0 : -(smooth - actual),
  );

  return (
    <div
      ref={scrollRef}
      className={cn('overflow-auto', className)}
    >
      <motion.div
        style={{
          y: offsetY,
          willChange: prefersReducedMotion ? 'auto' : 'transform',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
