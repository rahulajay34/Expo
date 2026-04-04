'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { springSnappy, reducedMotionTransition } from '@/lib/motion';
import { supportsViewTransitions } from '@/lib/view-transitions';

/**
 * Page transition wrapper.
 *
 * When the browser supports the View Transitions API, the cross-fade and
 * morphing are handled natively via `document.startViewTransition()` in
 * the navigation helpers.  In that case this component renders children
 * without Framer Motion animation to avoid a double-transition.
 *
 * On browsers without View Transitions support, the existing Framer Motion
 * AnimatePresence fade serves as the fallback.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [hasNativeVT, setHasNativeVT] = useState(false);

  useEffect(() => {
    setHasNativeVT(supportsViewTransitions());
  }, []);

  // When the browser handles view transitions natively, skip Framer Motion
  // animation.  The wrapper div keeps the same layout behavior.
  if (hasNativeVT) {
    return (
      <div style={{ flex: '1 1 0%', minHeight: 0, overflow: 'hidden', width: '100%' }}>
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={prefersReducedMotion ? reducedMotionTransition : { ...springSnappy, opacity: { duration: 0.2 } }}
        style={{ flex: '1 1 0%', minHeight: 0, overflow: 'hidden', width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
