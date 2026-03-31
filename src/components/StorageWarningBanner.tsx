'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { shouldWarnStorage, getStorageStats } from '@/lib/storage';

export function StorageWarningBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkStorage = () => {
      const warned = sessionStorage.getItem('storage_banner_dismissed');
      if (warned === '1') {
        setDismissed(true);
        return;
      }
      const shouldWarn = shouldWarnStorage();
      const { usedBytes, maxBytes } = getStorageStats();
      const pct = usedBytes / maxBytes;
      setVisible(shouldWarn && pct >= 0.8);
    };

    checkStorage();
    window.addEventListener('storage', checkStorage);
    return () => window.removeEventListener('storage', checkStorage);
  }, [mounted]);

  if (!mounted || !visible || dismissed) return null;

  const { usedBytes, maxBytes } = getStorageStats();
  const pct = usedBytes / maxBytes;
  const isCritical = pct >= 0.9;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('storage_banner_dismissed', '1');
  };

  return (
    <div
      className={`px-6 py-2.5 text-xs flex items-center justify-between gap-4 shrink-0 ${
        isCritical ? 'bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800'
      }`}
    >
      <div className={`flex items-center gap-2 ${isCritical ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
        <span>⚠️</span>
        <span>
          {isCritical
            ? 'Storage critically full — delete old content now to avoid losing new generations.'
            : 'Storage almost full — delete old content to avoid losing new generations.'}
        </span>
        <span className="font-normal opacity-70">
          ({Math.round(pct * 100)}% used)
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/settings"
          className={`font-medium hover:underline ${isCritical ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300' : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'}`}
        >
          Manage storage →
        </Link>
        <button
          onClick={handleDismiss}
          className={`hover:opacity-70 leading-none ${isCritical ? 'text-red-400 dark:text-red-500' : 'text-amber-400 dark:text-amber-500'}`}
          aria-label="Dismiss storage warning"
        >
          ×
        </button>
      </div>
    </div>
  );
}
