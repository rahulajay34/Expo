'use client';

import { useEffect, useRef, RefObject } from 'react';

/**
 * Hook that detects clicks outside of the referenced element
 * Useful for closing modals, dropdowns, and popovers
 * 
 * @param callback - Function to call when click outside is detected
 * @param enabled - Whether the hook is active (default: true)
 * @returns Ref to attach to the element
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  callback: () => void,
  enabled: boolean = true
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callbackRef.current();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callbackRef.current();
      }
    };

    // Use mousedown instead of click for better UX
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [enabled]);

  return ref;
}
