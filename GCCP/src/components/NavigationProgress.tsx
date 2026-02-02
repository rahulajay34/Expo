'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * NavigationProgress - Shows a loading bar during page navigation
 * Similar to NProgress but built with React/Next.js in mind
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incrementRef = useRef<NodeJS.Timeout | null>(null);
  const prevPathRef = useRef(pathname);
  const prevSearchRef = useRef(searchParams.toString());

  // Cleanup timeouts
  const clearAllTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (incrementRef.current) {
      clearInterval(incrementRef.current);
      incrementRef.current = null;
    }
  }, []);

  // Start progress
  const startProgress = useCallback(() => {
    clearAllTimeouts();
    setIsNavigating(true);
    setProgress(10);

    // Gradually increase progress
    incrementRef.current = setInterval(() => {
      setProgress(prev => {
        // Slow down as we approach 90%
        if (prev >= 90) return prev;
        const increment = Math.max(1, (90 - prev) / 10);
        return Math.min(prev + increment, 90);
      });
    }, 200);
  }, [clearAllTimeouts]);

  // Complete progress
  const completeProgress = useCallback(() => {
    clearAllTimeouts();
    setProgress(100);
    
    // Hide after animation completes
    timeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, 300);
  }, [clearAllTimeouts]);

  // Detect route changes
  useEffect(() => {
    const currentPath = pathname;
    const currentSearch = searchParams.toString();

    // Check if route actually changed
    if (currentPath !== prevPathRef.current || currentSearch !== prevSearchRef.current) {
      // Navigation completed
      completeProgress();
      prevPathRef.current = currentPath;
      prevSearchRef.current = currentSearch;
    }
  }, [pathname, searchParams, completeProgress]);

  // Intercept link clicks to start progress immediately
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && !link.target && !link.download) {
        const url = new URL(link.href);
        const currentUrl = new URL(window.location.href);
        
        // Only for internal navigation
        if (url.origin === currentUrl.origin) {
          // Check if it's actually a different page
          if (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search) {
            startProgress();
          }
        }
      }
    };

    // Also intercept programmatic navigation via router
    const handleBeforeUnload = () => {
      startProgress();
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearAllTimeouts();
    };
  }, [startProgress, clearAllTimeouts]);

  if (!isNavigating && progress === 0) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent pointer-events-none"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-200 ease-out shadow-lg shadow-blue-500/50"
        style={{
          width: `${progress}%`,
          opacity: isNavigating ? 1 : 0,
        }}
      />
      {/* Glow effect */}
      {isNavigating && (
        <div
          className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-white/50 to-transparent animate-pulse"
          style={{ right: `${100 - progress}%` }}
        />
      )}
    </div>
  );
}

/**
 * Hook to manually trigger navigation progress
 * Useful for programmatic navigation
 */
export function useNavigationProgress() {
  const [isNavigating, setIsNavigating] = useState(false);

  const start = useCallback(() => {
    setIsNavigating(true);
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('navigation:start'));
  }, []);

  const done = useCallback(() => {
    setIsNavigating(false);
    window.dispatchEvent(new CustomEvent('navigation:done'));
  }, []);

  return { isNavigating, start, done };
}
