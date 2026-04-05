'use client';

import { useEffect, useRef } from 'react';
import { useSpring, motion, useReducedMotion } from 'framer-motion';

interface CountUpProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * Smoothly animates a number from its previous value to the new value
 * using Framer Motion's useSpring for physics-based interpolation.
 */
export function CountUp({ value, duration = 300, className, prefix = '', suffix = '' }: CountUpProps) {
  const prefersReducedMotion = useReducedMotion();
  const displayRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(value);

  // Spring-based value animation
  const springValue = useSpring(value, {
    stiffness: prefersReducedMotion ? 1000 : Math.max(100, 600 / (duration / 100)),
    damping: prefersReducedMotion ? 100 : 30,
    mass: 0.8,
  });

  // Update spring target when value changes
  useEffect(() => {
    springValue.set(value);
    prevValueRef.current = value;
  }, [value, springValue]);

  // Render the interpolated value to the DOM ref for performance
  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (displayRef.current) {
        displayRef.current.textContent = `${prefix}${Math.round(latest)}${suffix}`;
      }
    });
    return unsubscribe;
  }, [springValue, prefix, suffix]);

  return (
    <motion.span
      ref={displayRef}
      className={className}
      aria-live="polite"
      aria-atomic="true"
    >
      {prefix}{Math.round(value)}{suffix}
    </motion.span>
  );
}
