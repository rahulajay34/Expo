'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Hook for copying text to clipboard with a temporary "copied" state.
 * Shows a sonner toast on success and reverts the copied state after 2 seconds.
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, []);

  return { copied, copy };
}
