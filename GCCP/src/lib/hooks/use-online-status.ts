'use client';

import { useSyncExternalStore, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

/**
 * Hook that tracks browser online/offline status.
 * Shows a toast when connectivity changes.
 */
export function useOnlineStatus() {
  const wasOfflineRef = useRef(false);
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const showToasts = useCallback(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      toast.success('Back online!', { duration: 3000 });
    }
  }, [isOnline]);

  useEffect(() => {
    showToasts();
  }, [showToasts]);

  return isOnline;
}
