'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAsyncReturn<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  execute: (...args: unknown[]) => Promise<T | void>;
  reset: () => void;
}

/**
 * Hook for handling async operations with loading and error states
 * Automatically handles race conditions and cleanup
 * 
 * @param asyncFunction - The async function to execute
 * @param immediate - Whether to execute immediately on mount
 * @returns Object containing data, error, loading state, and execute function
 */
export function useAsync<T>(
  asyncFunction: (...args: unknown[]) => Promise<T>,
  immediate: boolean = false
): UseAsyncReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(immediate);
  
  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true);
  // Track latest request to handle race conditions
  const latestRequestRef = useRef(0);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | void> => {
      const requestId = ++latestRequestRef.current;
      
      setLoading(true);
      setError(null);
      
      try {
        const result = await asyncFunction(...args);
        
        // Only update state if this is the latest request and component is mounted
        if (mountedRef.current && requestId === latestRequestRef.current) {
          setData(result);
          setLoading(false);
        }
        
        return result;
      } catch (e) {
        // Only update state if this is the latest request and component is mounted
        if (mountedRef.current && requestId === latestRequestRef.current) {
          const err = e instanceof Error ? e : new Error(String(e));
          setError(err);
          setLoading(false);
        }
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Execute on mount if immediate is true
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { data, error, loading, execute, reset };
}
