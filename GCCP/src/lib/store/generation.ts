import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GenerationState, ContentMode, AgentStatus, InstructorQualityResult } from '@/types/content';
import { storeLog as log } from '@/lib/utils/env-logger';

// Content buffer for throttled updates (outside React lifecycle)
let contentBuffer = '';
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
let lastFlushTime = 0;
const FLUSH_INTERVAL = 150; // ms between flushes

/**
 * Cleanup function to be called on component unmount or navigation
 * Ensures no memory leaks from pending timeouts
 */
export function cleanupContentBuffer(): void {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  contentBuffer = '';
  lastFlushTime = 0;
  log.debug('Content buffer cleaned up');
}

interface GenerationStore extends GenerationState {
  transcript?: string;
  formattedContent?: string;
  estimatedCost?: number;
  tokenUsage?: { input: number; output: number };
  setTopic: (topic: string) => void;
  setSubtopics: (subtopics: string) => void;
  setMode: (mode: ContentMode) => void;
  setTranscript: (transcript: string) => void;
  setStatus: (status: GenerationState['status']) => void;
  setCurrentAgent: (agent: string) => void;
  setCurrentAction: (action: string) => void;
  updateContent: (chunk: string) => void;
  flushContentBuffer: () => void;
  setContent: (content: string) => void;
  setFormattedContent: (content: string) => void;
  setGapAnalysis: (result: any) => void;
  instructorQuality: InstructorQualityResult | null;
  setInstructorQuality: (result: InstructorQualityResult | null) => void;
  setEstimatedCost: (cost: number) => void;
  addLog: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  addStepLog: (agent: string, message: string) => void;

  reset: () => void;
  clearGenerationState: () => void;
  setId: (id: string | number) => void;
  assignmentCounts: { mcsc: number; mcmc: number; subjective: number };
  setAssignmentCounts: (counts: { mcsc: number; mcmc: number; subjective: number }) => void;
}

export const useGenerationStore = create<GenerationStore>()(
  persist(
    (set, get) => ({
      id: undefined,
      topic: '',
      subtopics: '',
      mode: 'lecture',
      transcript: '',
      status: 'idle',
      currentAgent: null,
      currentAction: null,
      agentProgress: {},
      gapAnalysis: null,
      instructorQuality: null,
      finalContent: '',
      formattedContent: '',
      logs: [],
      createdAt: 0,
      updatedAt: 0,
      assignmentCounts: { mcsc: 5, mcmc: 3, subjective: 2 },

      setId: (id) => set({ id }),
      setTopic: (topic) => set({ topic }),
      setAssignmentCounts: (assignmentCounts) => set({ assignmentCounts }),
      setSubtopics: (subtopics) => set({ subtopics }),
      setMode: (mode) => set({ mode }),
      setTranscript: (transcript) => set({ transcript }),
      setStatus: (status) => set({ status }),
      setCurrentAgent: (currentAgent) => set({ currentAgent }),
      setCurrentAction: (currentAction) => set({ currentAction }),

      // Throttled content update - buffers chunks and flushes periodically
      updateContent: (chunk) => {
        contentBuffer += chunk;

        const now = Date.now();
        const timeSinceLastFlush = now - lastFlushTime;

        // If enough time has passed, flush immediately
        if (timeSinceLastFlush >= FLUSH_INTERVAL) {
          if (flushTimeout) {
            clearTimeout(flushTimeout);
            flushTimeout = null;
          }
          const bufferedContent = contentBuffer;
          contentBuffer = '';
          lastFlushTime = now;
          set((state) => ({ finalContent: (state.finalContent || '') + bufferedContent }));
          return;
        }

        // Otherwise, schedule a flush if not already scheduled
        if (!flushTimeout) {
          flushTimeout = setTimeout(() => {
            const bufferedContent = contentBuffer;
            contentBuffer = '';
            lastFlushTime = Date.now();
            flushTimeout = null;
            if (bufferedContent) {
              set((state) => ({ finalContent: (state.finalContent || '') + bufferedContent }));
            }
          }, FLUSH_INTERVAL - timeSinceLastFlush);
        }
      },

      // Force flush any remaining buffered content
      flushContentBuffer: () => {
        if (flushTimeout) {
          clearTimeout(flushTimeout);
          flushTimeout = null;
        }
        if (contentBuffer) {
          const bufferedContent = contentBuffer;
          contentBuffer = '';
          lastFlushTime = Date.now();
          set((state) => ({ finalContent: (state.finalContent || '') + bufferedContent }));
        }
      },

      setContent: (content) => set({ finalContent: content }),
      setFormattedContent: (content) => set({ formattedContent: content }),
      setGapAnalysis: (result: any) => set({ gapAnalysis: result }),
      setInstructorQuality: (result: InstructorQualityResult | null) => set({ instructorQuality: result }),
      setEstimatedCost: (estimatedCost) => set({ estimatedCost }),
      addLog: (message, type: 'info' | 'success' | 'warning' | 'error' = 'info') => set((state) => ({
        logs: [...(state.logs || []), { message, type, timestamp: Date.now() }]
      })),
      addStepLog: (agent, message) => set((state) => ({
        logs: [...(state.logs || []), { type: 'step', agent, message, timestamp: Date.now() }]
      })),
      reset: () => {
        // Clear buffer on reset
        contentBuffer = '';
        if (flushTimeout) {
          clearTimeout(flushTimeout);
          flushTimeout = null;
        }
        set({
          id: undefined, topic: '', subtopics: '', status: 'idle', finalContent: '', formattedContent: '', currentAgent: null, currentAction: null, gapAnalysis: null, instructorQuality: null, transcript: '', logs: [], estimatedCost: 0
        });
      },
      clearGenerationState: () => {
        // Clear buffer when clearing generation state
        contentBuffer = '';
        if (flushTimeout) {
          clearTimeout(flushTimeout);
          flushTimeout = null;
        }
        set({
          logs: [],
          finalContent: '',
          formattedContent: '',
          gapAnalysis: null,
          instructorQuality: null,
          currentAgent: null,
          currentAction: null,
          agentProgress: {},
          estimatedCost: 0
        });
      }
    }),
    {
      name: 'generation-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        topic: state.topic,
        subtopics: state.subtopics,
        mode: state.mode,
        transcript: state.transcript,
        finalContent: state.finalContent,
        formattedContent: state.formattedContent,
        gapAnalysis: state.gapAnalysis,
        logs: state.logs,
        status: (state.status === 'generating' || state.status === 'mismatch') ? 'idle' : state.status
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const cleanedProgress: Record<string, any> = {};
          if (state.agentProgress) {
            for (const [agent, status] of Object.entries(state.agentProgress)) {
              cleanedProgress[agent] = status === 'working' ? 'idle' : status;
            }
          }
          useGenerationStore.setState({
            agentProgress: cleanedProgress,
            currentAgent: null,
            currentAction: null,
          });
          log.debug('Store rehydrated and reset stuck agents');
        }
      },
    }
  )
);
