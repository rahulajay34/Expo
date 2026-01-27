/**
 * State Persistence Recovery Utility
 * Helps recover and repair corrupted or stuck generation states
 */

import { useGenerationStore } from '@/lib/store/generation';

interface RecoveryResult {
    wasCorrupted: boolean;
    fixes: string[];
    recoveredContent: boolean;
}

/**
 * Check if state needs recovery and apply fixes
 * Call this on app startup to handle edge cases
 */
export function checkAndRecoverState(): RecoveryResult {
    const result: RecoveryResult = {
        wasCorrupted: false,
        fixes: [],
        recoveredContent: false
    };

    try {
        const stored = localStorage.getItem('generation-storage');
        if (!stored) {
            return result;
        }

        const parsed = JSON.parse(stored);
        const state = parsed?.state;

        if (!state) {
            return result;
        }

        // Check for stuck generating status (should be reset by persist partialize, but double-check)
        if (state.status === 'generating') {
            state.status = 'idle';
            result.wasCorrupted = true;
            result.fixes.push('Reset stuck generating status');
        }

        // Check for orphaned agent/action states
        if (state.status === 'idle' && (state.currentAgent || state.currentAction)) {
            state.currentAgent = null;
            state.currentAction = null;
            result.wasCorrupted = true;
            result.fixes.push('Cleared orphaned agent state');
        }

        // Check for truncated JSON in finalContent (assignment mode)
        if (state.mode === 'assignment' && state.finalContent) {
            const content = state.finalContent.trim();
            if (content.startsWith('[') && !content.endsWith(']')) {
                // Attempt to recover partial JSON array
                try {
                    // Find last complete object
                    const lastBrace = content.lastIndexOf('}');
                    if (lastBrace > 0) {
                        const recovered = content.slice(0, lastBrace + 1) + ']';
                        JSON.parse(recovered); // Validate it parses
                        state.finalContent = recovered;
                        result.wasCorrupted = true;
                        result.fixes.push('Recovered truncated assignment JSON');
                        result.recoveredContent = true;
                    }
                } catch {
                    // Can't recover, leave as-is
                }
            }
        }

        // Check for excessively large logs array
        if (state.logs && state.logs.length > 100) {
            state.logs = state.logs.slice(-50); // Keep last 50
            result.wasCorrupted = true;
            result.fixes.push('Trimmed excessive logs');
        }

        // Check for invalid mode value
        const validModes = ['lecture', 'pre-read', 'assignment'];
        if (state.mode && !validModes.includes(state.mode)) {
            state.mode = 'lecture';
            result.wasCorrupted = true;
            result.fixes.push('Reset invalid mode to lecture');
        }

        // Save repaired state back
        if (result.wasCorrupted) {
            const repaired = JSON.stringify({ ...parsed, state });
            localStorage.setItem('generation-storage', repaired);

            // Force store to reload
            useGenerationStore.persist.rehydrate();

            console.info('🔧 State recovery applied:', result.fixes);
        }

    } catch (e) {
        console.error('State recovery check failed:', e);
        // If localStorage is totally corrupted, clear it
        try {
            localStorage.removeItem('generation-storage');
            result.wasCorrupted = true;
            result.fixes.push('Cleared corrupted storage');
        } catch {
            // Can't access localStorage at all
        }
    }

    return result;
}

/**
 * Force clear all persisted state (nuclear option)
 */
export function clearAllPersistedState(): void {
    localStorage.removeItem('generation-storage');
    useGenerationStore.getState().reset();
    console.info('🗑️ All persisted state cleared');
}

/**
 * Export current state for debugging
 */
export function exportStateForDebug(): string {
    const state = useGenerationStore.getState();
    return JSON.stringify({
        topic: state.topic,
        subtopics: state.subtopics,
        mode: state.mode,
        status: state.status,
        currentAgent: state.currentAgent,
        finalContentLength: state.finalContent?.length || 0,
        formattedContentLength: state.formattedContent?.length || 0,
        logsCount: state.logs?.length || 0,
        hasGapAnalysis: !!state.gapAnalysis,
        estimatedCost: state.estimatedCost
    }, null, 2);
}
