import { create } from 'zustand';
import type {
  ContentMode,
  GenerationParams,
  PipelineStep,
  Toast,
  GapAnalysisResult,
  CourseContext,
  InstructorQualityResult,
} from '../types';
import { Orchestrator, PipelineEvent } from '../lib/agents/orchestrator';

// ─────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────

type Page = 'editor' | 'settings' | 'prompts' | 'history';

interface NavigationSlice {
  currentPage: Page;
  sidebarCollapsed: boolean;
  navigate: (page: Page) => void;
  toggleSidebar: () => void;
}

// ─────────────────────────────────────────────
// Generation
// ─────────────────────────────────────────────

interface GenerationSlice {
  isGenerating: boolean;
  streamingContent: string;
  formattedAssignment: string | null;
  pipelineSteps: PipelineStep[];
  gapAnalysis: GapAnalysisResult | null;
  courseContext: CourseContext | null;
  instructorQuality: InstructorQualityResult | null;
  error: string | null;

  startGeneration: (params: GenerationParams) => Promise<void>;
  abortGeneration: () => void;
  resetGeneration: () => void;
}

// ─────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────

interface ToastSlice {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// ─────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────

interface ThemeSlice {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

// ─────────────────────────────────────────────
// Combined Store
// ─────────────────────────────────────────────

type AppStore = NavigationSlice & GenerationSlice & ToastSlice & ThemeSlice;

let orchestrator: Orchestrator | null = null;

export const useStore = create<AppStore>((set, get) => ({
  // ── Navigation ──
  currentPage: 'editor',
  sidebarCollapsed: false,
  navigate: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // ── Generation ──
  isGenerating: false,
  streamingContent: '',
  formattedAssignment: null,
  pipelineSteps: [],
  gapAnalysis: null,
  courseContext: null,
  instructorQuality: null,
  error: null,

  startGeneration: async (params) => {
    set({
      isGenerating: true,
      streamingContent: '',
      formattedAssignment: null,
      pipelineSteps: [],
      gapAnalysis: null,
      courseContext: null,
      instructorQuality: null,
      error: null,
    });

    orchestrator = new Orchestrator();

    try {
      for await (const event of orchestrator.generate(params)) {
        const e = event as PipelineEvent;

        switch (e.type) {
          case 'step':
            set((s) => {
              const existing = s.pipelineSteps.findIndex(
                (p) => p.agent === e.agent
              );
              const step: PipelineStep = {
                agent: e.agent || '',
                status: (e.status as PipelineStep['status']) || 'working',
                message: e.message || '',
              };
              const steps = [...s.pipelineSteps];
              if (existing >= 0) {
                steps[existing] = step;
              } else {
                steps.push(step);
              }
              return { pipelineSteps: steps };
            });
            break;

          case 'chunk':
            set((s) => ({
              streamingContent: s.streamingContent + (e.content || ''),
            }));
            break;

          case 'replace':
            set({ streamingContent: e.content || '' });
            break;

          case 'gap_analysis':
            set({ gapAnalysis: e.content });
            break;

          case 'course_detected':
            set({ courseContext: e.content });
            break;

          case 'instructor_quality':
            set({ instructorQuality: e.content });
            break;

          case 'formatted':
            set({ formattedAssignment: e.content });
            break;

          case 'warning':
            get().addToast({ type: 'warning', message: e.message || 'Warning' });
            break;

          case 'error':
            set({ error: e.message || 'An error occurred' });
            get().addToast({ type: 'error', message: e.message || 'Error' });
            break;

          case 'mismatch_stop':
            set({ error: e.message || 'Mismatch detected', isGenerating: false });
            get().addToast({ type: 'error', message: e.message || 'Transcript mismatch' });
            return;

          case 'complete':
            set({
              streamingContent: e.content || '',
              isGenerating: false,
            });
            get().addToast({ type: 'success', message: 'Generation complete!' });
            break;
        }
      }
    } catch (err: any) {
      if (err.message !== 'Aborted') {
        set({ error: err.message, isGenerating: false });
        get().addToast({ type: 'error', message: err.message });
      }
    } finally {
      set({ isGenerating: false });
      orchestrator = null;
    }
  },

  abortGeneration: () => {
    orchestrator?.abort();
    set({ isGenerating: false });
    get().addToast({ type: 'info', message: 'Generation aborted' });
  },

  resetGeneration: () =>
    set({
      isGenerating: false,
      streamingContent: '',
      formattedAssignment: null,
      pipelineSteps: [],
      gapAnalysis: null,
      courseContext: null,
      instructorQuality: null,
      error: null,
    }),

  // ── Toast ──
  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    const duration =
      toast.type === 'error' ? 8000 :
      toast.type === 'warning' ? 6000 :
      4000;
    setTimeout(() => get().removeToast(id), duration);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ── Theme ──
  theme: 'system',
  setTheme: (theme) => {
    set({ theme });
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    } else {
      root.setAttribute('data-theme', theme);
      root.classList.toggle('dark', theme === 'dark');
    }
    localStorage.setItem('gccp-theme', theme);
  },
}));
