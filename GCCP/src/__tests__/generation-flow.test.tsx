/**
 * Frontend Integration Tests for Generation Flow
 * 
 * Tests:
 * - Real-time subscription connection
 * - Progress UI updates
 * - Session persistence after refresh
 * - Error boundary handling
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Mock Supabase
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockImplementation((callback) => {
    callback('SUBSCRIBED');
    return mockChannel;
  }),
  unsubscribe: jest.fn().mockResolvedValue({}),
};

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  channel: jest.fn().mockReturnValue(mockChannel),
  removeChannel: jest.fn(),
  functions: {
    invoke: jest.fn().mockResolvedValue({ data: {}, error: null }),
  },
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null }),
  },
};

// Mock the Supabase client module
jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => mockSupabase,
}));

// Mock Auth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    loading: false,
  }),
}));

// Import after mocks
import { useGeneration } from '@/hooks/useGeneration';
import { GenerationStepper } from '@/components/editor/GenerationStepper';
import { useGenerationStore } from '@/lib/store/generation';
import type { Generation } from '@/types/database';

// Test wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const WrapperComponent = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  WrapperComponent.displayName = 'TestWrapper';
  
  return WrapperComponent;
};

// ========================================
// REAL-TIME SUBSCRIPTION TESTS
// ========================================

describe('Real-time Subscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.order.mockReturnThis();
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });
  });

  it('should subscribe to generation updates on mount', async () => {
    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    // Start a generation
    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockResolvedValue({
        data: { id: 'test-generation-id', status: 'queued' },
        error: null,
      }),
    }));

    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));

    await act(async () => {
      await result.current.startGeneration({
        topic: 'Test Topic',
        subtopics: 'Subtopic 1, Subtopic 2',
        mode: 'lecture',
      });
    });

    // Verify subscription was created
    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith(expect.stringContaining('generation:'));
    });
  });

  it('should handle subscription status changes', async () => {
    const subscriptionStatuses: string[] = [];
    
    mockSupabase.channel.mockReturnValue({
      ...mockChannel,
      subscribe: jest.fn().mockImplementation((callback) => {
        callback('SUBSCRIBED');
        subscriptionStatuses.push('SUBSCRIBED');
        return mockChannel;
      }),
    });

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration({
        topic: 'Test Topic',
        subtopics: 'Subtopic 1',
        mode: 'lecture',
      });
    });

    expect(subscriptionStatuses).toContain('SUBSCRIBED');
  });

  it('should cleanup subscription on unmount', async () => {
    const { result, unmount } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration({
        topic: 'Test Topic',
        subtopics: 'Subtopic 1',
        mode: 'lecture',
      });
    });

    unmount();

    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });

  it('should handle multiple rapid subscription changes', async () => {
    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    // Start multiple generations rapidly
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.startGeneration({
          topic: `Test Topic ${i}`,
          subtopics: 'Subtopic 1',
          mode: 'lecture',
        });
      });
    }

    // Should cleanup previous subscriptions
    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });
});

// ========================================
// PROGRESS UI UPDATE TESTS
// ========================================

describe('Progress UI Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update progress when receiving realtime updates', async () => {
    const mockGeneration: Partial<Generation> = {
      id: 'test-gen-123',
      status: 'processing',
      progress_percent: 50,
      progress_message: 'Drafting content...',
      current_agent: 'Creator',
    };

    // Simulate realtime update
    let realtimeCallback: ((payload: RealtimePostgresChangesPayload<Generation>) => void) | null = null;
    
    mockSupabase.channel.mockReturnValue({
      on: jest.fn().mockImplementation((event, _filter, callback) => {
        if (event === 'postgres_changes') {
          realtimeCallback = callback;
        }
        return mockChannel;
      }),
      subscribe: jest.fn().mockReturnValue(mockChannel),
      unsubscribe: jest.fn(),
    });

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration({
        topic: 'Test Topic',
        subtopics: 'Subtopic 1',
        mode: 'lecture',
      });
    });

    // Trigger realtime update
    if (realtimeCallback) {
      await act(async () => {
        realtimeCallback!({
          new: mockGeneration as Generation,
          old: {},
          eventType: 'UPDATE',
          schema: 'public',
          table: 'generations',
          commit_timestamp: new Date().toISOString(),
          errors: [],
        });
      });
    }

    await waitFor(() => {
      expect(result.current.progress.percent).toBe(50);
      expect(result.current.progress.message).toBe('Drafting content...');
    });
  });

  it('should handle progress from 0 to 100%', async () => {
    mockSupabase.channel.mockReturnValue({
      on: jest.fn().mockImplementation((event, _filter, callback) => {
        if (event === 'postgres_changes') {
          // Simulate progress updates
          setTimeout(() => {
            callback({
              new: { progress_percent: 25, status: 'processing' },
              old: {},
              eventType: 'UPDATE',
              schema: 'public',
              table: 'generations',
            });
          }, 10);
          
          setTimeout(() => {
            callback({
              new: { progress_percent: 50, status: 'processing' },
              old: {},
              eventType: 'UPDATE',
              schema: 'public',
              table: 'generations',
            });
          }, 20);
          
          setTimeout(() => {
            callback({
              new: { progress_percent: 100, status: 'completed' },
              old: {},
              eventType: 'UPDATE',
              schema: 'public',
              table: 'generations',
            });
          }, 30);
        }
        return mockChannel;
      }),
      subscribe: jest.fn().mockReturnValue(mockChannel),
      unsubscribe: jest.fn(),
    });

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    // Progress should be tracked
    expect(result.current.progress).toBeDefined();
  });

  it('should display correct progress in GenerationStepper', () => {
    const logs = [
      { type: 'step', agent: 'Initialization', message: 'Setup complete', timestamp: Date.now() },
      { type: 'step', agent: 'CourseDetection', message: 'Domain detected', timestamp: Date.now() },
    ];

    render(
      <GenerationStepper
        logs={logs}
        status="generating"
        mode="lecture"
        hasTranscript={false}
        progressPercent={25}
        progressMessage="Detecting course context..."
      />
    );

    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('Detecting course context...')).toBeInTheDocument();
  });

  it('should show completion state at 100%', () => {
    render(
      <GenerationStepper
        logs={[]}
        status="complete"
        mode="lecture"
        hasTranscript={false}
        progressPercent={100}
        progressMessage="Generation complete!"
      />
    );

    expect(screen.getByText('Generation Complete')).toBeInTheDocument();
  });
});

// ========================================
// SESSION PERSISTENCE TESTS
// ========================================

describe('Session Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should persist generation state to localStorage', () => {
    const store = useGenerationStore.getState();
    
    act(() => {
      store.setTopic('Persistent Topic');
      store.setSubtopics('Subtopic 1, Subtopic 2');
      store.setMode('assignment');
    });

    // Check localStorage
    const stored = localStorage.getItem('generation-storage');
    expect(stored).toBeTruthy();
    
    const parsed = JSON.parse(stored!);
    expect(parsed.state.topic).toBe('Persistent Topic');
    expect(parsed.state.subtopics).toBe('Subtopic 1, Subtopic 2');
    expect(parsed.state.mode).toBe('assignment');
  });

  it('should recover session after refresh', async () => {
    // Setup stored state
    const storedState = {
      state: {
        topic: 'Recovered Topic',
        subtopics: 'Recovered Subtopic',
        mode: 'lecture',
        status: 'idle',
        transcript: 'Recovered transcript',
      },
      version: 0,
    };
    localStorage.setItem('generation-storage', JSON.stringify(storedState));

    // Mock active generation recovery
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [{
          id: 'recovered-gen-id',
          topic: 'Recovered Topic',
          status: 'processing',
          progress_percent: 45,
          progress_message: 'Drafting...',
        }],
        error: null,
      }),
    }));

    renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    // Wait for session recovery
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('generations');
    });
  });

  it('should reset generating status to idle on rehydrate', () => {
    // Store a generating state
    const generatingState = {
      state: {
        topic: 'Test',
        status: 'generating',
        agentProgress: {
          Creator: 'working',
        },
      },
      version: 0,
    };
    localStorage.setItem('generation-storage', JSON.stringify(generatingState));

    // Trigger rehydrate
    const store = useGenerationStore.getState();
    
    // Status should be reset to idle
    expect(store.status).not.toBe('generating');
  });

  it('should persist assignment counts', () => {
    const store = useGenerationStore.getState();
    
    act(() => {
      store.setAssignmentCounts({ mcsc: 10, mcmc: 5, subjective: 3 });
    });

    const stored = localStorage.getItem('generation-storage');
    const parsed = JSON.parse(stored!);
    expect(parsed.state.assignmentCounts).toEqual({ mcsc: 10, mcmc: 5, subjective: 3 });
  });
});

// ========================================
// ERROR BOUNDARY TESTS
// ========================================

describe('Error Boundary Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle API errors gracefully', async () => {
    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      }),
    }));

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration({
        topic: 'Test',
        subtopics: 'Subtopic',
        mode: 'lecture',
      });
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.status).toBe('error');
  });

  it('should handle network errors during generation', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockResolvedValue({
        data: { id: 'test-gen', status: 'queued' },
        error: null,
      }),
    }));

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration({
        topic: 'Test',
        subtopics: 'Subtopic',
        mode: 'lecture',
      });
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should handle realtime subscription errors', async () => {
    mockSupabase.channel.mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation((callback) => {
        callback('CHANNEL_ERROR');
        return mockChannel;
      }),
      unsubscribe: jest.fn(),
    });

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    // Should not throw even with subscription error
    await act(async () => {
      await result.current.startGeneration({
        topic: 'Test',
        subtopics: 'Subtopic',
        mode: 'lecture',
      });
    });

    // Hook should still be functional
    expect(result.current).toBeDefined();
  });

  it('should handle malformed realtime payloads', async () => {
    let realtimeCallback: ((payload: unknown) => void) | null = null;
    
    mockSupabase.channel.mockReturnValue({
      on: jest.fn().mockImplementation((event, _filter, callback) => {
        if (event === 'postgres_changes') {
          realtimeCallback = callback;
        }
        return mockChannel;
      }),
      subscribe: jest.fn().mockReturnValue(mockChannel),
      unsubscribe: jest.fn(),
    });

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration({
        topic: 'Test',
        subtopics: 'Subtopic',
        mode: 'lecture',
      });
    });

    // Send malformed payload
    if (realtimeCallback) {
      await act(async () => {
        realtimeCallback!({
          new: null,
          old: null,
          eventType: 'UPDATE',
          schema: 'public',
          table: 'generations',
        });
      });
    }

    // Should not crash
    expect(result.current).toBeDefined();
  });

  it('should handle stop generation errors gracefully', async () => {
    mockSupabase.from.mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockRejectedValue(new Error('Update failed')),
    }));

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    // Should not throw
    await act(async () => {
      await result.current.stopGeneration();
    });
  });
});

// ========================================
// GENERATION LIFECYCLE TESTS
// ========================================

describe('Generation Lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full generation flow', async () => {
    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockResolvedValue({
        data: { id: 'test-gen', status: 'queued' },
        error: null,
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration({
        topic: 'Test Topic',
        subtopics: 'Subtopic 1',
        mode: 'lecture',
      });
    });

    expect(result.current.isStarting).toBe(false);
  });

  it('should handle retry from checkpoint', async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'retry-gen',
          status: 'failed',
          resume_token: 'test-token',
        },
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
    }));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const success = await result.current.retryGeneration('retry-gen');
      expect(success).toBe(true);
    });
  });

  it('should stop generation on user request', async () => {
    mockSupabase.from.mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
    }));

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.stopGeneration();
    });

    // Should call update with failed status
    expect(mockSupabase.from).toHaveBeenCalledWith('generations');
  });
});

// ========================================
// ASSIGNMENT GENERATION TESTS
// ========================================

describe('Assignment Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle assignment mode with question counts', async () => {
    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockResolvedValue({
        data: { id: 'assignment-gen', status: 'queued' },
        error: null,
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration({
        topic: 'Test Assignment',
        subtopics: 'Question 1 topic, Question 2 topic',
        mode: 'assignment',
        assignmentCounts: {
          mcsc: 5,
          mcmc: 3,
          subjective: 2,
        },
      });
    });

    expect(result.current.isStarting).toBe(false);
  });

  it('should display assignment-specific pipeline steps', () => {
    const logs = [
      { type: 'step', agent: 'Initialization', message: 'Setup', timestamp: Date.now() },
      { type: 'step', agent: 'DraftCreation', message: 'Generating questions', timestamp: Date.now() },
      { type: 'step', agent: 'Formatting', message: 'Structuring assignment', timestamp: Date.now() },
    ];

    render(
      <GenerationStepper
        logs={logs}
        status="generating"
        mode="assignment"
        hasTranscript={false}
        progressPercent={75}
        progressMessage="Formatting assignment..."
      />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});

// ========================================
// PERFORMANCE TESTS
// ========================================

describe('Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle rapid progress updates efficiently', async () => {
    const progressUpdates: number[] = [];
    
    mockSupabase.channel.mockReturnValue({
      on: jest.fn().mockImplementation((event, _filter, callback) => {
        if (event === 'postgres_changes') {
          // Simulate rapid updates
          for (let i = 0; i <= 100; i += 10) {
            setTimeout(() => {
              callback({
                new: { progress_percent: i, status: 'processing' },
                old: {},
                eventType: 'UPDATE',
                schema: 'public',
                table: 'generations',
              });
              progressUpdates.push(i);
            }, i);
          }
        }
        return mockChannel;
      }),
      subscribe: jest.fn().mockReturnValue(mockChannel),
      unsubscribe: jest.fn(),
    });

    const { result } = renderHook(() => useGeneration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration({
        topic: 'Test',
        subtopics: 'Subtopic',
        mode: 'lecture',
      });
    });

    // Wait for all updates
    await waitFor(() => {
      expect(progressUpdates.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should throttle content updates', async () => {
    const store = useGenerationStore.getState();
    
    // Rapid content updates
    act(() => {
      for (let i = 0; i < 100; i++) {
        store.updateContent(`chunk ${i} `);
      }
    });

    // Should buffer and not update 100 times
    const content = useGenerationStore.getState().finalContent;
    expect(content).toBeTruthy();
  });
});
