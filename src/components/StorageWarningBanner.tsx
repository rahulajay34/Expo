'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getTotalLocalStorageUsage, getAllContent, getLargestItems, deleteContent } from '@/lib/storage';
import type { ContentItem } from '@/lib/types';

const WARN_THRESHOLD = 0.8;
const CRITICAL_THRESHOLD = 0.9;
const LARGEST_N = 3;

type LargestItem = ContentItem & { bytes: number };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function StorageWarningBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [percent, setPercent] = useState(0);
  const [largestItems, setLargestItems] = useState<LargestItem[]>([]);

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
      if (usage.percent >= CRITICAL_THRESHOLD) {
        setLargestItems(getLargestItems(LARGEST_N));
      }
    } else {
      setVisible(false);
      setLargestItems([]);
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

  const isCritical = percent >= CRITICAL_THRESHOLD;
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

  const handleDeleteOldest = () => {
    if (largestItems.length === 0) return;
    // Delete the oldest among the largest items (smallest createdAt timestamp)
    const oldest = largestItems.reduce((prev, cur) =>
      prev.createdAt < cur.createdAt ? prev : cur
    );
    deleteContent(oldest.id);
    // checkStorage will re-run via app-storage-changed event fired by deleteContent
  };

  const colorClass = isCritical
    ? 'text-red-700 dark:text-red-400'
    : 'text-amber-700 dark:text-amber-400';
  const linkClass = isCritical
    ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
    : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300';
  const dismissClass = isCritical
    ? 'text-red-400 dark:text-red-500'
    : 'text-amber-400 dark:text-amber-500';
  const bgClass = isCritical
    ? 'bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800'
    : 'bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800';

  return (
    <div className={`px-6 py-2.5 text-xs shrink-0 ${bgClass}`}>
      <div className="flex items-center justify-between gap-4">
        <div className={`flex items-center gap-2 ${colorClass}`}>
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
            className={`font-medium hover:underline ${linkClass}`}
          >
            Download Backup
          </button>
          <Link
            href="/settings"
            className={`font-medium hover:underline ${linkClass}`}
          >
            Manage storage
          </Link>
          <button
            onClick={handleDismiss}
            className={`hover:opacity-70 leading-none ${dismissClass}`}
            aria-label="Dismiss storage warning"
          >
            &times;
          </button>
        </div>
      </div>

      {isCritical && largestItems.length > 0 && (
        <div className={`mt-2 flex items-center gap-4 flex-wrap ${colorClass}`}>
          <span className="opacity-70 shrink-0">Largest items:</span>
          <ol className="flex items-center gap-3 flex-wrap list-none">
            {largestItems.map((item) => (
              <li key={item.id} className="flex items-center gap-1">
                <span
                  className="max-w-[160px] truncate font-medium"
                  title={item.title || 'Untitled'}
                >
                  {item.title || 'Untitled'}
                </span>
                <span className="opacity-60">({formatBytes(item.bytes)})</span>
              </li>
            ))}
          </ol>
          <button
            onClick={handleDeleteOldest}
            className={`shrink-0 font-medium underline hover:no-underline ${linkClass}`}
            title="Delete the oldest of the 3 largest items"
          >
            Delete oldest
          </button>
        </div>
      )}
    </div>
  );
}
