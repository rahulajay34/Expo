'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { supportsViewTransitions } from '@/lib/view-transitions';

/** Material Design standard easing as a typed tuple for Framer Motion */
const EASE_STANDARD: [number, number, number, number] = [0.4, 0, 0.2, 1];

/**
 * ContentReveal — smooth fade-in + slide-up for page content that replaces
 * skeleton loading states. Creates the perception of content "materializing"
 * from the skeleton.
 *
 * Coordinates with existing transition systems:
 * - View Transitions API: skips animation if a view transition just completed
 *   (the browser already handled the morph)
 * - PageTransition (Framer Motion fallback): when VT is not supported,
 *   PageTransition handles the overall fade; ContentReveal focuses on stagger
 *   timing only
 */
export function ContentReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [hasNativeVT, setHasNativeVT] = useState(false);

  useEffect(() => {
    setHasNativeVT(supportsViewTransitions());
  }, []);

  // Skip animation entirely for reduced motion preference
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: EASE_STANDARD,
        // Small delay when no native VT — lets PageTransition's Framer fade
        // settle first so they don't overlap
        delay: hasNativeVT ? 0 : 0.05,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered container + item variants for page content reveals (grid/list cards).
 * Intentionally different from motion.ts staggerContainer/staggerItem which are
 * for dropdown menus (spring easing, no delay). These use Material Design tween
 * easing with a slight delay to coordinate with page transitions.
 */
export const staggerRevealContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

export const staggerRevealItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: EASE_STANDARD,
    },
  },
};
