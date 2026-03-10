'use client';

import { useCallback, useSyncExternalStore, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { getSavedDraft, clearDraft, type DraftData } from '@/lib/hooks/use-auto-save';

/**
 * Read the saved draft via useSyncExternalStore so the initial value is
 * resolved during the first client render (no effect-based setState needed).
 * localStorage is a synchronous API, so getSnapshot is fine here.
 */
const emptySubscribe = () => () => {};

// Module-level cache so getSnapshotDraft is a stable reference and returns
// the same object reference when the underlying raw string has not changed.
// This prevents useSyncExternalStore from triggering an infinite re-render
// loop caused by JSON.parse() returning a new object reference on every call.
const DRAFT_KEY = 'gccp-draft';
let _cachedRaw: string | null | undefined = undefined; // undefined = uninitialized
let _cachedDraft: DraftData | null = null;

function getSnapshotDraft(): DraftData | null {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (raw === _cachedRaw) return _cachedDraft; // same raw → same object reference
  _cachedRaw = raw;
  _cachedDraft = raw ? (JSON.parse(raw) as DraftData) : null;
  return _cachedDraft;
}

function useInitialDraft(): DraftData | null {
  return useSyncExternalStore(
    emptySubscribe,
    getSnapshotDraft,  // stable module-level reference, never recreated
    () => null,
  );
}

export function DraftBanner() {
  const draft = useInitialDraft();
  const [dismissed, setDismissed] = useState(false);

  const handleRestore = useCallback(() => {
    if (!draft) return;

    const store = useAppStore.getState();
    store.setTopic(draft.topic);
    store.setSubtopics(draft.subtopics);
    store.setContent(draft.content);
    store.setContentType(draft.contentType as Parameters<typeof store.setContentType>[0]);
    store.setQuestions(draft.questions as Parameters<typeof store.setQuestions>[0]);

    // Clear the draft after restoring
    clearDraft();
    setDismissed(true);
  }, [draft]);

  const handleDiscard = useCallback(() => {
    clearDraft();
    setDismissed(true);
  }, []);

  const show = draft !== null && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <Alert className="relative border-blue-500/30 bg-blue-500/5 dark:border-blue-500/20 dark:bg-blue-500/10">
            <FileText className="size-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-700 dark:text-blue-300">
              Unsaved draft found
            </AlertTitle>
            <AlertDescription>
              <p>
                You have an unsaved draft from{' '}
                <span className="font-medium">
                  {formatDistanceToNow(new Date(draft!.timestamp), {
                    addSuffix: true,
                  })}
                </span>
                . Would you like to restore it?
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  onClick={handleRestore}
                  className="h-7 gap-1.5 text-xs"
                >
                  Restore Draft
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDiscard}
                  className="h-7 gap-1.5 text-xs"
                >
                  Discard
                </Button>
              </div>
            </AlertDescription>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={handleDiscard}
              className="absolute right-2 top-2 shrink-0 text-blue-600/70 hover:text-blue-600 dark:text-blue-400/70 dark:hover:text-blue-400"
            >
              <X className="size-3.5" />
            </Button>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
