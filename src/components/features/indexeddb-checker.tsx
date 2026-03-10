'use client';

import { useIndexedDBCheck } from '@/lib/hooks/use-indexeddb-check';

/**
 * Invisible component that checks IndexedDB availability on mount
 * and shows a warning toast if unavailable.
 */
export function IndexedDBChecker() {
  useIndexedDBCheck();
  return null;
}
