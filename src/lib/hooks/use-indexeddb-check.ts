'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Hook that checks IndexedDB availability on first mount.
 * Shows a warning toast if IndexedDB is not available (e.g., private browsing).
 */
export function useIndexedDBCheck() {
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    async function check() {
      try {
        // Attempt to open a temporary database to verify IndexedDB works
        const testDbName = '__gccp_idb_test__';
        const request = indexedDB.open(testDbName, 1);

        await new Promise<void>((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            request.result.close();
            // Clean up test database
            indexedDB.deleteDatabase(testDbName);
            resolve();
          };
        });
      } catch {
        toast.warning(
          "Storage unavailable \u2014 your generations won't be saved between sessions",
          { duration: 8000 }
        );
      }
    }

    check();
  }, []);
}
