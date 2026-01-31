import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GenerationState, ContentMode, AgentStatus } from '@/types/content';
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

interface MismatchDetails {
  message: string;
  detectedCourse?: string;
  suggestedCourse?: string;
}

interface GenerationStore extends GenerationState {
  transcript?: string;
  formattedContent?: string;
      estimatedCost: number | null;
  tokenCount: number | null;
  modelUsed: string | null;
  mismatchDetails: MismatchDetails | null;
  // Streaming state
  isStreaming: boolean;
  streamingContent: string;
  streamingIntervalId: ReturnType<typeof setTimeout> | null;
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
  setEstimatedCost: (cost: number) => void;
  setTokenCount: (count: number | null) => void;
  setModelUsed: (model: string | null) => void;
  setMismatchDetails: (details: MismatchDetails | null) => void;
  addLog: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  addStepLog: (agent: string, message: string) => void;
  // Streaming methods
  startStreaming: (questions: any[]) => void;
  stopStreaming: () => void;

  reset: () => void;
  clearGenerationState: () => void;
  assignmentCounts: { mcsc: number; mcmc: number; subjective: number };
  setAssignmentCounts: (counts: { mcsc: number; mcmc: number; subjective: number }) => void;
}

export const useGenerationStore = create<GenerationStore>()(
  persist(
    (set, get) => ({
      topic: '',
      subtopics: '',
      mode: 'lecture',
      transcript: '',
      status: 'idle',
      currentAgent: null,
      currentAction: null,
      agentProgress: {},
      gapAnalysis: null,
      finalContent: '',
      formattedContent: '',
      logs: [],
      createdAt: 0,
      updatedAt: 0,
      assignmentCounts: { mcsc: 5, mcmc: 3, subjective: 2 },
      // Streaming state
      isStreaming: false,
      streamingContent: '',
      streamingIntervalId: null,
      mismatchDetails: null,
      estimatedCost: null,
      tokenCount: null,
      modelUsed: null,

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
      setEstimatedCost: (estimatedCost) => set({ estimatedCost }),
      setTokenCount: (tokenCount) => set({ tokenCount }),
      setModelUsed: (modelUsed) => set({ modelUsed }),
      setMismatchDetails: (mismatchDetails) => set({ mismatchDetails }),

      // Start streaming word-by-word display with 2-second intervals
      startStreaming: (questions: any[]) => {
        const state = get();
        // Clear any existing streaming interval
        if (state.streamingIntervalId) {
          clearInterval(state.streamingIntervalId);
        }

        // Convert questions to formatted string
        const content = JSON.stringify({ questions }, null, 2);
        const words = content.split(/\s+/);
        let currentIndex = 0;

        const intervalId = setInterval(() => {
          if (currentIndex >= words.length) {
            clearInterval(intervalId);
            set({ isStreaming: false, streamingIntervalId: null });
            return;
          }

          const nextWords = words.slice(0, currentIndex + 1).join(' ');
          set({
            streamingContent: nextWords,
            isStreaming: true,
          });
          currentIndex++;
        }, 2000); // 2-second intervals

        set({
          isStreaming: true,
          streamingIntervalId: intervalId,
          streamingContent: words[0] || '',
        });
      },

      // Stop streaming and clear interval
      stopStreaming: () => {
        const state = get();
        if (state.streamingIntervalId) {
          clearInterval(state.streamingIntervalId);
        }
        set({
          isStreaming: false,
          streamingIntervalId: null,
          streamingContent: '',
        });
      },
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
        // Clear streaming state
        const state = get();
        if (state.streamingIntervalId) {
          clearInterval(state.streamingIntervalId);
        }
        set({
          topic: '', subtopics: '', status: 'idle', finalContent: '', formattedContent: '', currentAgent: null, currentAction: null, gapAnalysis: null, transcript: '', logs: [], estimatedCost: null, tokenCount: null, modelUsed: null,
          isStreaming: false, streamingContent: '', streamingIntervalId: null, mismatchDetails: null,
        });
      },
      clearGenerationState: () => {
        // Clear buffer when clearing generation state
        contentBuffer = '';
        if (flushTimeout) {
          clearTimeout(flushTimeout);
          flushTimeout = null;
        }
        // Clear streaming state
        const state = get();
        if (state.streamingIntervalId) {
          clearInterval(state.streamingIntervalId);
        }
        set({
          logs: [],
          finalContent: '',
          formattedContent: '',
          gapAnalysis: null,
          currentAgent: null,
          currentAction: null,
          agentProgress: {},
          estimatedCost: null,
          tokenCount: null,
          modelUsed: null,
          isStreaming: false,
          streamingContent: '',
          streamingIntervalId: null,
          mismatchDetails: null,
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
        // CRITICAL FIX: Preserve generating status across navigation
        status: state.status,
        currentAgent: state.currentAgent,
        currentAction: state.currentAction,
        estimatedCost: state.estimatedCost,
        assignmentCounts: state.assignmentCounts,
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
