/**
 * Mock Supabase Client for Testing
 *
 * Provides a fully mocked Supabase client for unit and integration tests.
 */

import { vi } from 'vitest';
import type { 
  Generation, 
  GenerationLog, 
  Checkpoint, 
  GenerationMetric,
  HistoricalTimingData,
  FeedbackScore 
} from '@/types/database';

// ========================================
// MOCK DATA GENERATORS
// ========================================

export function generateMockGeneration(overrides?: Partial<Generation>): Generation {
  const now = new Date().toISOString();
  return {
    id: `gen-${Math.random().toString(36).substring(2, 9)}`,
    user_id: 'test-user-id',
    topic: 'Test Topic',
    subtopics: 'Subtopic 1, Subtopic 2',
    mode: 'lecture',
    status: 'queued',
    current_step: 0,
    transcript: null,
    final_content: null,
    assignment_data: null,
    gap_analysis: null,
    course_context: null,
    error_message: null,
    estimated_cost: 0,
    locked_by: null,
    progress_percent: 0,
    progress_message: 'Initializing...',
    partial_content: null,
    current_agent: null,
    started_at: null,
    completed_at: null,
    resume_token: null,
    last_checkpoint_step: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function generateMockGenerationLog(overrides?: Partial<GenerationLog>): GenerationLog {
  return {
    id: `log-${Math.random().toString(36).substring(2, 9)}`,
    generation_id: 'test-generation-id',
    agent_name: 'Orchestrator',
    message: 'Test log message',
    log_type: 'info',
    metadata: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function generateMockCheckpoint(overrides?: Partial<Checkpoint>): Checkpoint {
  return {
    id: `chk-${Math.random().toString(36).substring(2, 9)}`,
    generation_id: 'test-generation-id',
    step_name: 'draft_creation',
    step_number: 3,
    content_snapshot: JSON.stringify({ content: 'Test content' }),
    metadata: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function generateMockGenerationMetric(overrides?: Partial<GenerationMetric>): GenerationMetric {
  const now = new Date().toISOString();
  return {
    id: `metric-${Math.random().toString(36).substring(2, 9)}`,
    generation_id: 'test-generation-id',
    stage_name: 'DraftCreation',
    stage_weight: 35,
    started_at: now,
    completed_at: now,
    duration_ms: 5000,
    token_count: null,
    cost_estimate: null,
    metadata: null,
    created_at: now,
    ...overrides,
  };
}

export function generateMockHistoricalTiming(overrides?: Partial<HistoricalTimingData>): HistoricalTimingData {
  return {
    id: `hist-${Math.random().toString(36).substring(2, 9)}`,
    stage_name: 'DraftCreation',
    mode: 'lecture',
    avg_duration_ms: 30000,
    min_duration_ms: 20000,
    max_duration_ms: 60000,
    sample_count: 10,
    last_updated: new Date().toISOString(),
    ...overrides,
  };
}

export function generateMockFeedbackScore(overrides?: Partial<FeedbackScore>): FeedbackScore {
  return {
    id: `feedback-${Math.random().toString(36).substring(2, 9)}`,
    generation_id: 'test-generation-id',
    agent_name: 'Critic',
    iteration: 1,
    overall_score: 0.85,
    completeness_score: 0.9,
    accuracy_score: 0.8,
    pedagogy_score: 0.85,
    formatting_score: 0.9,
    feedback_text: 'Good quality content',
    suggestions: ['Improve examples'],
    metadata: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ========================================
// MOCK SUPABASE CHANNEL
// ========================================

type CallbackFunction = (payload: unknown) => void;

export class MockRealtimeChannel {
  private callbacks: Map<string, CallbackFunction[]> = new Map();
  private subscriptionStatus: string = 'CLOSED';

  on(event: string, _filter: unknown, callback: CallbackFunction): this {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
    return this;
  }

  subscribe(callback?: (status: string) => void): this {
    this.subscriptionStatus = 'SUBSCRIBED';
    if (callback) {
      callback('SUBSCRIBED');
    }
    return this;
  }

  unsubscribe(): Promise<{ error: Error | null }> {
    this.subscriptionStatus = 'CLOSED';
    return Promise.resolve({ error: null });
  }

  trigger(event: string, payload: unknown): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(payload));
    }
  }

  getStatus(): string {
    return this.subscriptionStatus;
  }
}

// ========================================
// MOCK SUPABASE CLIENT
// ========================================

interface MockDatabase {
  generations: Generation[];
  generation_logs: GenerationLog[];
  checkpoints: Checkpoint[];
  generation_metrics: GenerationMetric[];
  historical_timing: HistoricalTimingData[];
  feedback_scores: FeedbackScore[];
}

export function createMockSupabaseClient() {
  const channels: Map<string, MockRealtimeChannel> = new Map();
  
  // Mock database storage
  const db: MockDatabase = {
    generations: [],
    generation_logs: [],
    checkpoints: [],
    generation_metrics: [],
    historical_timing: [],
    feedback_scores: [],
  };

  const mockClient = {
    // Database operations
    from: vi.fn((table: keyof MockDatabase) => {
      const tableData = db[table] || [];
      
      return {
        select: vi.fn((_columns: string | string[] = '*') => {
          // _columns is unused but kept for API compatibility
          void _columns;
          return {
            eq: vi.fn((column: string, value: unknown) => ({
              order: vi.fn((_column: string, { ascending = true } = {}) => ({
                limit: vi.fn((n: number) => {
                  let results = tableData.filter((row: Record<string, unknown>) => 
                    row[column] === value
                  );
                  if (!ascending) {
                    results = results.reverse();
                  }
                  return Promise.resolve({ data: results.slice(0, n), error: null });
                }),
                single: vi.fn(() => {
                  const result = tableData.find((row: Record<string, unknown>) => 
                    row[column] === value
                  );
                  return Promise.resolve({ data: result || null, error: result ? null : { message: 'Not found' } });
                }),
              })),
              in: vi.fn((_column: string, values: unknown[]) => ({
                order: vi.fn(() => ({
                  limit: vi.fn((n: number) => {
                    const results = tableData.filter((row: Record<string, unknown>) => 
                      values.includes(row[column])
                    );
                    return Promise.resolve({ data: results.slice(0, n), error: null });
                  }),
                })),
              })),
              single: vi.fn(() => {
                const result = tableData.find((row: Record<string, unknown>) => 
                  row[column] === value
                );
                return Promise.resolve({ data: result || null, error: result ? null : { message: 'Not found' } });
              }),
            })),
            order: vi.fn(() => ({
              limit: vi.fn((n: number) => {
                return Promise.resolve({ data: tableData.slice(0, n), error: null });
              }),
            })),
          };
        }),
        
        insert: vi.fn((data: unknown) => ({
          select: vi.fn(() => ({
            single: vi.fn(() => {
              const newRecord = {
                id: `${table.slice(0, -1)}-${Math.random().toString(36).substring(2, 9)}`,
                created_at: new Date().toISOString(),
                ...(Array.isArray(data) ? data[0] : data),
              };
              (tableData as unknown[]).push(newRecord);
              return Promise.resolve({ data: newRecord, error: null });
          }),
          })),
        })),
        
        update: vi.fn((data: unknown) => ({
          eq: vi.fn((column: string, value: unknown) => {
            const index = tableData.findIndex((row: Record<string, unknown>) => 
              row[column] === value
            );
            if (index !== -1) {
              const existingRecord = tableData[index] as Record<string, unknown>;
              (tableData as unknown[])[index] = {
                ...existingRecord,
                ...(data as Record<string, unknown>),
                updated_at: new Date().toISOString(),
              };
            }
            return Promise.resolve({ data: null, error: null });
          }),
        })),
        
        delete: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => {
            const index = tableData.findIndex((row: Record<string, unknown>) => 
              row[column] === value
            );
            if (index !== -1) {
              (tableData as unknown[]).splice(index, 1);
            }
            return Promise.resolve({ data: null, error: null });
          }),
        })),
      };
    }),

    // Realtime
    channel: vi.fn((name: string) => {
      const channel = new MockRealtimeChannel();
      channels.set(name, channel);
      return channel;
    }),

    removeChannel: vi.fn((channel: MockRealtimeChannel) => {
      channel.unsubscribe();
      for (const [name, ch] of channels.entries()) {
        if (ch === channel) {
          channels.delete(name);
          break;
        }
      }
      return Promise.resolve({ error: null });
    }),

    // Functions
    functions: {
      invoke: vi.fn((_name: string, _params?: { body?: unknown }) => {
        // _name and _params are unused but kept for API compatibility
        void _name;
        void _params;
        return Promise.resolve({ data: { success: true }, error: null });
      }),
    },

    // Auth
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: {
          session: {
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            user: { id: 'test-user-id', email: 'test@example.com' },
          },
        },
        error: null,
      })),
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      })),
    },

    // Storage helpers
    _db: db,
    _channels: channels,
    
    // Helper to reset state
    _reset: () => {
      db.generations = [];
      db.generation_logs = [];
      db.checkpoints = [];
      db.generation_metrics = [];
      db.historical_timing = [];
      db.feedback_scores = [];
      channels.clear();
    },

    // Helper to trigger realtime events
    _triggerRealtime: (channelName: string, event: string, payload: unknown) => {
      const channel = channels.get(channelName);
      if (channel) {
        channel.trigger(event, payload);
      }
    },
  };

  return mockClient;
}

// ========================================
// MOCK ANTHROPIC API
// ========================================

export function createMockAnthropicClient() {
  return {
    messages: {
      create: vi.fn(async (params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        system?: string;
        max_tokens?: number;
        temperature?: number;
      }) => {
        // Simulate different responses based on the prompt content
        const lastMessage = params.messages[params.messages.length - 1]?.content || '';
        
        // Course detection response
        if (lastMessage.includes('subject domain')) {
          return {
            content: [{
              text: JSON.stringify({
                domain: 'computer_science',
                confidence: 0.95,
                characteristics: {
                  exampleTypes: ['code examples', 'algorithms'],
                  formats: ['technical documentation'],
                  vocabulary: ['function', 'variable', 'class'],
                  styleHints: ['technical', 'precise'],
                  relatableExamples: ['programming scenarios'],
                },
                contentGuidelines: 'Focus on practical examples',
                qualityCriteria: 'Code should be runnable',
              }),
            }],
            usage: { input_tokens: 100, output_tokens: 50 },
          };
        }

        // Gap analysis response
        if (lastMessage.includes('subtopics are covered')) {
          return {
            content: [{
              text: JSON.stringify({
                covered: ['Subtopic 1'],
                notCovered: ['Subtopic 2'],
                partiallyCovered: [],
                transcriptTopics: ['Topic A', 'Topic B'],
              }),
            }],
            usage: { input_tokens: 200, output_tokens: 30 },
          };
        }

        // Content creation response
        if (lastMessage.includes('Create') && lastMessage.includes('content')) {
          return {
            content: [{
              text: '# Generated Content\n\nThis is sample generated content for testing purposes.',
            }],
            usage: { input_tokens: 500, output_tokens: 200 },
          };
        }

        // Question generation response
        if (lastMessage.includes('Generate a single')) {
          return {
            content: [{
              text: JSON.stringify({
                type: 'mcq_single',
                question: 'What is the capital of France?',
                options: ['Paris', 'London', 'Berlin', 'Madrid'],
                correctAnswer: 'Paris',
                explanation: 'Paris is the capital city of France.',
                difficulty: 'easy',
                topic: 'Geography',
              }),
            }],
            usage: { input_tokens: 300, output_tokens: 100 },
          };
        }

        // Review response
        if (lastMessage.includes('Review this')) {
          return {
            content: [{
              text: JSON.stringify({
                score: 8,
                needsPolish: false,
                feedback: 'Good quality content',
                detailedFeedback: ['Well structured', 'Clear explanations'],
              }),
            }],
            usage: { input_tokens: 400, output_tokens: 50 },
          };
        }

        // Critic evaluation response
        if (lastMessage.includes('Evaluate content')) {
          return {
            content: [{
              text: JSON.stringify({
                overall_score: 8.5,
                category_scores: {
                  theoretical_practical_balance: { score: 8, weight: 0.25, feedback: 'Good balance' },
                  clarity_structure: { score: 9, weight: 0.25, feedback: 'Very clear' },
                  accuracy_depth: { score: 8, weight: 0.25, feedback: 'Accurate' },
                  engagement_level: { score: 9, weight: 0.25, feedback: 'Engaging' },
                },
                feedback_summary: 'High quality content',
                actionable_improvements: [],
                meets_threshold: true,
                recommended_action: 'publish',
              }),
            }],
            usage: { input_tokens: 500, output_tokens: 150 },
          };
        }

        // Default response
        return {
          content: [{ text: 'Default mock response' }],
          usage: { input_tokens: 100, output_tokens: 20 },
        };
      }),
    },

    // Helper to set custom responses
    _setResponse: vi.fn(),
  };
}

// ========================================
// TEST DATA FACTORIES
// ========================================

export const TestDataFactory = {
  generation: generateMockGeneration,
  generationLog: generateMockGenerationLog,
  checkpoint: generateMockCheckpoint,
  generationMetric: generateMockGenerationMetric,
  historicalTiming: generateMockHistoricalTiming,
  feedbackScore: generateMockFeedbackScore,
  
  // Create a complete generation scenario
  createGenerationScenario: (overrides?: {
    generation?: Partial<Generation>;
    logs?: Partial<GenerationLog>[];
    checkpoints?: Partial<Checkpoint>[];
  }) => {
    const generation = generateMockGeneration({
      status: 'completed',
      progress_percent: 100,
      final_content: '# Completed Content',
      ...overrides?.generation,
    });

    const logs = overrides?.logs || [
      generateMockGenerationLog({ generation_id: generation.id, agent_name: 'Initialization' }),
      generateMockGenerationLog({ generation_id: generation.id, agent_name: 'CourseDetection' }),
      generateMockGenerationLog({ generation_id: generation.id, agent_name: 'DraftCreation' }),
    ];

    const checkpoints = overrides?.checkpoints || [
      generateMockCheckpoint({ generation_id: generation.id, step_name: 'course_detection', step_number: 1 }),
      generateMockCheckpoint({ generation_id: generation.id, step_name: 'draft_creation', step_number: 3 }),
    ];

    return { generation, logs, checkpoints };
  },

  // Create an in-progress generation
  createInProgressGeneration: (progressPercent: number = 50) => {
    return generateMockGeneration({
      status: 'processing',
      progress_percent: progressPercent,
      current_agent: 'DraftCreation',
      progress_message: 'Generating content...',
      started_at: new Date().toISOString(),
    });
  },

  // Create a failed generation
  createFailedGeneration: (errorMessage: string = 'Generation failed') => {
    return generateMockGeneration({
      status: 'failed',
      error_message: errorMessage,
      progress_percent: 45,
      progress_message: `Error: ${errorMessage}`,
    });
  },
};

// ========================================
// MOCK FETCH FOR API TESTS
// ========================================

export function createMockFetch(responseMap: Map<string, { status: number; body: unknown }>) {
  return vi.fn(async (url: string) => {
    const response = responseMap.get(url);
    
    if (response) {
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => response.body,
        text: async () => JSON.stringify(response.body),
        headers: new Headers({ 'content-type': 'application/json' }),
        clone: function() { return this; },
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        redirected: false,
        statusText: response.status === 200 ? 'OK' : 'Error',
        type: 'basic' as ResponseType,
        url: '',
      } as Response;
    }

    // Default 404 response
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
      text: async () => 'Not found',
      headers: new Headers(),
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      redirected: false,
      statusText: 'Not Found',
      type: 'basic' as ResponseType,
      url: '',
    } as Response;
  });
}

// ========================================
// MOCK LOCAL STORAGE
// ========================================

export class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }

  // Helper to get parsed JSON
  getParsed<T>(key: string): T | null {
    const item = this.getItem(key);
    if (item) {
      try {
        return JSON.parse(item) as T;
      } catch {
        return null;
      }
    }
    return null;
  }

  // Helper to set JSON
  setParsed<T>(key: string, value: T): void {
    this.setItem(key, JSON.stringify(value));
  }
}

// ========================================
// SETUP HELPERS
// ========================================

export function setupTestEnvironment() {
  // Mock localStorage
  const mockLocalStorage = new MockLocalStorage();
  Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });

  // Mock window.location
  Object.defineProperty(global, 'location', {
    value: {
      reload: vi.fn(),
      href: 'http://localhost:3000',
    },
    writable: true,
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  return {
    localStorage: mockLocalStorage,
  };
}

export function cleanupTestEnvironment() {
  vi.clearAllMocks();
}
