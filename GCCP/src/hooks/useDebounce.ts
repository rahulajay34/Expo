'use client';

import { useEffect, useMemo, useRef } from 'react';
import debounce from 'lodash/debounce';

/**
 * Hook that returns a debounced version of a callback function
 * Automatically handles cleanup on unmount
 * 
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @param deps - Dependencies array that will trigger recreation of debounced function
 * @returns Debounced function
 */
export function useDebounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number = 300,
  deps: React.DependencyList = []
): T & { cancel: () => void; flush: () => void } {
  // Use ref to always have the latest callback
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Create the debounced function
  const debouncedFn = useMemo(() => {
    return debounce((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...deps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedFn.cancel();
    };
  }, [debouncedFn]);

  return debouncedFn as T & { cancel: () => void; flush: () => void };
}
