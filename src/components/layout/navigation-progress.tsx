'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * NavigationProgress
 * A YouTube/GitHub-style top-of-page loading bar that animates during
 * client-side route transitions. Detects route changes via `usePathname`
 * and plays a smooth indigo-to-violet gradient animation.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Start the loading bar whenever the pathname changes
  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    cleanup();

    // Start loading animation
    setIsNavigating(true);
    setProgress(0);

    // Quickly jump to ~15%, then slowly increment toward ~85%
    let current = 0;
    const jumpTo = 15 + Math.random() * 10; // 15-25%
    current = jumpTo;
    setProgress(current);

    intervalRef.current = setInterval(() => {
      current += (85 - current) * 0.08 + Math.random() * 2;
      if (current >= 85) {
        current = 85;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      setProgress(current);
    }, 100);

    // Since the route has already changed (usePathname fires after navigation),
    // we can complete the bar after a brief moment to simulate the transition
    timeoutRef.current = setTimeout(() => {
      cleanup();
      setProgress(100);

      // Fade out after reaching 100%
      timeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 300);
    }, 400);

    return cleanup;
  }, [pathname, cleanup]);

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Progress bar */}
          <motion.div
            className="h-[3px] origin-left"
            style={{
              background:
                'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
              boxShadow:
                '0 0 8px rgba(99, 102, 241, 0.4), 0 0 16px rgba(139, 92, 246, 0.2)',
              width: `${progress}%`,
              transition: 'width 0.2s ease-out',
            }}
          />

          {/* Glow tip at the leading edge */}
          <div
            className="absolute top-0 h-[3px] w-24"
            style={{
              right: `${100 - progress}%`,
              background:
                'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5))',
              filter: 'blur(3px)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
