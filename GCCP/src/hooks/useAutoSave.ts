'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGenerationStore } from '@/lib/store/generation';
import debounce from 'lodash/debounce';

interface AutoSaveOptions {
    /** Delay in ms before saving after changes (default: 30000 = 30s) */
    delay?: number;
    /** Key to use for localStorage */
    storageKey?: string;
    /** Callback when save occurs */
    onSave?: () => void;
}

interface DraftData {
    topic: string;
    subtopics: string;
    finalContent: string;
    formattedContent: string;
    mode: string;
    timestamp: number;
}

/**
 * Auto-save hook that persists draft content to localStorage
 * Saves automatically every 30 seconds (configurable) when content changes
 */
export function useAutoSave(options: AutoSaveOptions = {}) {
    const { delay = 30000, storageKey = 'gccp-draft', onSave } = options;
    const store = useGenerationStore();
    const lastSavedRef = useRef<string>('');
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Save draft to localStorage
    const saveDraft = useCallback(() => {
        const draft: DraftData = {
            topic: store.topic,
            subtopics: store.subtopics,
            finalContent: store.finalContent || '',
            formattedContent: store.formattedContent || '',
            mode: store.mode,
            timestamp: Date.now()
        };

        const draftString = JSON.stringify(draft);

        // Only save if content has changed
        if (draftString !== lastSavedRef.current) {
            localStorage.setItem(storageKey, draftString);
            lastSavedRef.current = draftString;
            onSave?.();
            console.log('[AutoSave] Draft saved at', new Date().toLocaleTimeString());
        }
    }, [store.topic, store.subtopics, store.finalContent, store.formattedContent, store.mode, storageKey, onSave]);

    // Debounced save
    const debouncedSave = useCallback(
        debounce(saveDraft, delay),
        [saveDraft, delay]
    );

    // Load draft from localStorage
    const loadDraft = useCallback((): DraftData | null => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const draft: DraftData = JSON.parse(saved);
                // Only return if less than 24 hours old
                if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
                    return draft;
                }
            }
        } catch (e) {
            console.error('[AutoSave] Failed to load draft', e);
        }
        return null;
    }, [storageKey]);

    // Apply draft to store
    const applyDraft = useCallback((draft: DraftData) => {
        store.setTopic(draft.topic);
        store.setSubtopics(draft.subtopics);
        if (draft.finalContent) {
            store.setContent(draft.finalContent);
        }
        if (draft.formattedContent) {
            store.setFormattedContent(draft.formattedContent);
        }
        console.log('[AutoSave] Draft restored');
    }, [store]);

    // Clear draft
    const clearDraft = useCallback(() => {
        localStorage.removeItem(storageKey);
        lastSavedRef.current = '';
        console.log('[AutoSave] Draft cleared');
    }, [storageKey]);

    // Check if draft exists
    const hasDraft = useCallback((): boolean => {
        return loadDraft() !== null;
    }, [loadDraft]);

    // Get draft age in human readable format
    const getDraftAge = useCallback((): string | null => {
        const draft = loadDraft();
        if (!draft) return null;

        const ageMs = Date.now() - draft.timestamp;
        const minutes = Math.floor(ageMs / 60000);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }, [loadDraft]);

    // Auto-save effect
    useEffect(() => {
        // Don't auto-save if content is empty or still generating
        if (!store.finalContent && !store.formattedContent) return;
        if (store.status === 'generating') return;

        debouncedSave();

        return () => {
            debouncedSave.cancel();
        };
    }, [store.finalContent, store.formattedContent, store.status, debouncedSave]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return {
        saveDraft,
        loadDraft,
        applyDraft,
        clearDraft,
        hasDraft,
        getDraftAge
    };
}
