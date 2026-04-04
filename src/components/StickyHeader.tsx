'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { springSnappy, reducedMotionTransition } from '@/lib/motion';

interface StickyHeaderProps {
  /** Whether the compact sticky header should be visible */
  isVisible: boolean;
  /** Content to render inside the sticky bar */
  children: ReactNode;
  /** Extra class names appended to the sticky bar container */
  className?: string;
}

/**
 * Animated sticky header bar that appears when the user scrolls past
 * the full page header.
 *
 * Uses `position: sticky` inside the scroll container, so it naturally
 * sits within the main content area (no sidebar offset needed).
 * Uses the existing `.glass-panel` class for frosted background.
 */
export function StickyHeader({ isVisible, children, className = '' }: StickyHeaderProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { y: -48, opacity: 0 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { y: -48, opacity: 0 }}
          transition={prefersReducedMotion ? reducedMotionTransition : springSnappy}
          className={`sticky top-0 z-30 h-12 flex items-center glass-panel border-b border-border ${className}`}
          style={{ willChange: 'transform, opacity' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
