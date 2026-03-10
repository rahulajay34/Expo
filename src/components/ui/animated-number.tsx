'use client';

import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring, motion } from 'framer-motion';

interface AnimatedNumberProps {
  /** The target number to animate towards. */
  value: number;
  /** Format function applied to the animated value before rendering.
   *  Defaults to `Math.round(n).toLocaleString('en-US')`. */
  format?: (n: number) => string;
  /** Animation duration in seconds. Defaults to 0.8. */
  duration?: number;
  /** Optional prefix rendered before the number (e.g. "$"). */
  prefix?: string;
  /** Optional suffix rendered after the number (e.g. " tokens"). */
  suffix?: string;
  /** Optional className on the wrapper span. */
  className?: string;
}

const defaultFormat = (n: number): string =>
  Math.round(n).toLocaleString('en-US');

/**
 * Animates a number from 0 (or its previous value) to the target value
 * using Framer Motion's `useSpring`. The animation starts when the element
 * scrolls into view.
 */
export function AnimatedNumber({
  value,
  format = defaultFormat,
  duration = 0.8,
  prefix,
  suffix,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });

  // When the element enters the viewport or the target value changes,
  // animate the motion value to the new target.
  useEffect(() => {
    if (inView) {
      motionValue.set(value);
    }
  }, [inView, value, motionValue]);

  // Subscribe to the spring value and update the DOM text directly
  // to avoid React re-renders on every animation frame.
  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent =
          (prefix ?? '') + format(latest) + (suffix ?? '');
      }
    });
    return unsubscribe;
  }, [springValue, format, prefix, suffix]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {prefix ?? ''}{format(0)}{suffix ?? ''}
    </motion.span>
  );
}
