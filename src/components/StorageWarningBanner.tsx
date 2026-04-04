'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getTotalLocalStorageUsage, getAllContent } from '@/lib/storage';

const WARN_THRESHOLD = 0.8;

export function StorageWarningBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const checkStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    const usage = getTotalLocalStorageUsage();
    setPercent(usage.percent);
    if (usage.percent >= WARN_THRESHOLD) {
      setVisible(true);
      // If a save happened and we're still over threshold, un-dismiss
      setDismissed(false);
    } else {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    checkStorage();

    // Re-check on native storage events (cross-tab) and our custom save event
    window.addEventListener('storage', checkStorage);
    window.addEventListener('app-storage-changed', checkStorage);
    return () => {
      window.removeEventListener('storage', checkStorage);
      window.removeEventListener('app-storage-changed', checkStorage);
    };
  }, [mounted, checkStorage]);

  if (!mounted || !visible || dismissed) return null;

  const isCritical = percent >= 0.9;
  const pctDisplay = Math.round(percent * 100);

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleBackup = () => {
    const items = getAllContent();
    const backup = { version: 1, exportedAt: new Date().toISOString(), items };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `news13n-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      document.body.appendChild(a);
      a.click();
    } finally {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      className={`px-6 py-2.5 text-xs flex items-center justify-between gap-4 shrink-0 ${
        isCritical ? 'bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800'
      }`}
    >
      <div className={`flex items-center gap-2 ${isCritical ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
        <span>&#9888;&#65039;</span>
        <span>
          {isCritical
            ? 'Storage critically full — delete old content or download a backup now.'
            : 'Storage almost full — consider freeing space or downloading a backup.'}
        </span>
        <span className="font-normal opacity-70">
          ({pctDisplay}% used)
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleBackup}
          className={`font-medium hover:underline ${isCritical ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300' : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'}`}
        >
          Download Backup
        </button>
        <Link
          href="/settings"
          className={`font-medium hover:underline ${isCritical ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300' : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'}`}
        >
          Manage storage
        </Link>
        <button
          onClick={handleDismiss}
          className={`hover:opacity-70 leading-none ${isCritical ? 'text-red-400 dark:text-red-500' : 'text-amber-400 dark:text-amber-500'}`}
          aria-label="Dismiss storage warning"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
