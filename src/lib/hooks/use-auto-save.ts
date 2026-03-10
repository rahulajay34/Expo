'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';

const DRAFT_KEY = 'gccp-draft';
const SAVE_INTERVAL_MS = 10_000;

export interface DraftData {
  topic: string;
  subtopics: string;
  content: string;
  contentType: string;
  questions: unknown[];
  timestamp: number;
}

/** Returns the saved draft from localStorage, or null if none exists. */
export function getSavedDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftData;
  } catch {
    return null;
  }
}

/** Removes the draft from localStorage. */
export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Auto-saves the current editor state to localStorage every 10 seconds.
 * Only saves when there is meaningful content (non-empty topic or content).
 * Clears the draft when generation completes successfully.
 */
export function useAutoSave(): void {
  const prevGeneratingRef = useRef<boolean>(false);

  // Periodic save
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useAppStore.getState();

      // Only save if there is meaningful content
      if (!state.topic.trim() && !state.content.trim()) return;

      const draft: DraftData = {
        topic: state.topic,
        subtopics: state.subtopics,
        content: state.content,
        contentType: state.contentType,
        questions: state.questions,
        timestamp: Date.now(),
      };

      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Ignore quota or serialization errors
      }
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Clear draft when isGenerating transitions from true -> false (generation completed)
  const isGenerating = useAppStore((s) => s.isGenerating);

  useEffect(() => {
    const wasGenerating = prevGeneratingRef.current;
    prevGeneratingRef.current = isGenerating;

    if (wasGenerating && !isGenerating) {
      // Generation just finished — clear the draft
      clearDraft();
    }
  }, [isGenerating]);
}
