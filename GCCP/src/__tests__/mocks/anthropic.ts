/**
 * Mock Anthropic API Client for Testing
 * 
 * Provides mocked responses for Anthropic API calls.
 */

// ========================================
// MOCK RESPONSE GENERATORS
// ========================================

export interface MockAnthropicResponse {
  content: Array<{ text: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
  id: string;
}

/**
 * Generate a mock course detection response
 */
export function generateCourseDetectionResponse(domain: string = 'computer_science'): MockAnthropicResponse {
  return {
    content: [{
      text: JSON.stringify({
        domain,
        confidence: 0.95,
        characteristics: {
          exampleTypes: ['code examples', 'algorithms', 'data structures'],
          formats: ['technical documentation', 'tutorials'],
          vocabulary: ['function', 'variable', 'class', 'object', 'method'],
          styleHints: ['technical', 'precise', 'structured'],
          relatableExamples: ['programming scenarios', 'real-world applications'],
        },
        contentGuidelines: 'Focus on practical, hands-on examples with clear explanations',
        qualityCriteria: 'Code examples should be runnable and well-commented',
      }),
    }],
    usage: { input_tokens: 150, output_tokens: 120 },
    model: 'claude-sonnet-4-5-20250929',
    id: `msg-${Math.random().toString(36).substring(2, 10)}`,
  };
}

/**
 * Generate a mock gap analysis response
 */
export function generateGapAnalysisResponse(
  covered: string[] = ['Arrays', 'Linked Lists'],
  notCovered: string[] = ['Trees'],
  partiallyCovered: string[] = ['Graphs']
): MockAnthropicResponse {
  return {
    content: [{
      text: JSON.stringify({
        covered,
        notCovered,
        partiallyCovered,
        transcriptTopics: ['Programming Basics', 'Data Structures'],
      }),
    }],
    usage: { input_tokens: 500, output_tokens: 80 },
    model: 'claude-sonnet-4-5-20250929',
    id: `msg-${Math.random().toString(36).substring(2, 10)}`,
  };
}

/**
 * Generate a mock content creation response
 */
export function generateContentResponse(content: string = '# Sample Content\n\nThis is generated content.'): MockAnthropicResponse {
  return {
    content: [{ text: content }],
    usage: { input_tokens: 800, output_tokens: 1500 },
    model: 'claude-sonnet-4-5-20250929',
    id: `msg-${Math.random().toString(36).substring(2, 10)}`,
  };
}

/**
 * Generate a mock question for assignments
 */
export function generateQuestionResponse(type: 'mcq_single' | 'mcq_multi' | 'subjective' = 'mcq_single'): MockAnthropicResponse {
  const baseQuestion = {
    type,
    question: 'What is the time complexity of binary search?',
    explanation: 'Binary search divides the search space in half with each iteration, resulting in O(log n) time complexity.',
    difficulty: 'medium',
    topic: 'Algorithms',
  };

  if (type === 'mcq_single') {
    return {
      content: [{
        text: JSON.stringify({
          ...baseQuestion,
          options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
          correctAnswer: 'O(log n)',
        }),
      }],
      usage: { input_tokens: 300, output_tokens: 150 },
      model: 'claude-sonnet-4-5-20250929',
      id: `msg-${Math.random().toString(36).substring(2, 10)}`,
    };
  }

  if (type === 'mcq_multi') {
    return {
      content: [{
        text: JSON.stringify({
          ...baseQuestion,
          options: ['O(log n)', 'O(n log n)', 'O(1)', 'O(n)'],
          correctAnswer: ['O(log n)', 'O(1)'],
        }),
      }],
      usage: { input_tokens: 300, output_tokens: 150 },
      model: 'claude-sonnet-4-5-20250929',
      id: `msg-${Math.random().toString(36).substring(2, 10)}`,
    };
  }

  // Subjective
  return {
    content: [{
      text: JSON.stringify({
        ...baseQuestion,
        sampleAnswer: 'Binary search has O(log n) time complexity because it halves the search space with each comparison.',
      }),
    }],
    usage: { input_tokens: 300, output_tokens: 150 },
    model: 'claude-sonnet-4-5-20250929',
    id: `msg-${Math.random().toString(36).substring(2, 10)}`,
  };
}

/**
 * Generate a mock review response
 */
export function generateReviewResponse(score: number = 8, needsPolish: boolean = false): MockAnthropicResponse {
  return {
    content: [{
      text: JSON.stringify({
        score,
        needsPolish,
        feedback: needsPolish ? 'Content needs improvement in clarity' : 'Content meets quality standards',
        detailedFeedback: needsPolish 
          ? ['Improve sentence structure', 'Add more examples']
          : ['Well structured', 'Clear explanations', 'Good examples'],
      }),
    }],
    usage: { input_tokens: 1000, output_tokens: 100 },
    model: 'claude-sonnet-4-5-20250929',
    id: `msg-${Math.random().toString(36).substring(2, 10)}`,
  };
}

/**
 * Generate a mock critic evaluation response
 */
export function generateCriticResponse(overallScore: number = 8.5): MockAnthropicResponse {
  const meetsThreshold = overallScore >= 8;
  const recommendedAction = meetsThreshold ? 'publish' : overallScore >= 6.5 ? 'refine' : 'regenerate';

  return {
    content: [{
      text: JSON.stringify({
        overall_score: overallScore,
        category_scores: {
          theoretical_practical_balance: { 
            score: Math.round(overallScore), 
            weight: 0.25, 
            feedback: 'Good balance of theory and practice' 
          },
          clarity_structure: { 
            score: Math.round(overallScore), 
            weight: 0.25, 
            feedback: 'Clear and well-structured' 
          },
          accuracy_depth: { 
            score: Math.round(overallScore), 
            weight: 0.25, 
            feedback: 'Accurate and sufficiently deep' 
          },
          engagement_level: { 
            score: Math.round(overallScore), 
            weight: 0.25, 
            feedback: 'Engaging content' 
          },
        },
        feedback_summary: `Content scored ${overallScore}/10. ${meetsThreshold ? 'Ready for publication.' : 'Needs improvement.'}`,
        actionable_improvements: meetsThreshold ? [] : ['Add more examples', 'Improve clarity'],
        meets_threshold: meetsThreshold,
        recommended_action: recommendedAction,
      }),
    }],
    usage: { input_tokens: 1500, output_tokens: 250 },
    model: 'claude-haiku-4-5-20251001',
    id: `msg-${Math.random().toString(36).substring(2, 10)}`,
  };
}

/**
 * Generate a mock sanitization response
 */
export function generateSanitizationResponse(sanitizedContent: string): MockAnthropicResponse {
  return {
    content: [{ text: sanitizedContent }],
    usage: { input_tokens: 2000, output_tokens: 1800 },
    model: 'claude-sonnet-4-5-20250929',
    id: `msg-${Math.random().toString(36).substring(2, 10)}`,
  };
}

/**
 * Generate a mock refinement response
 */
export function generateRefinementResponse(refinedContent: string): MockAnthropicResponse {
  return {
    content: [{ text: refinedContent }],
    usage: { input_tokens: 2000, output_tokens: 1500 },
    model: 'claude-sonnet-4-5-20250929',
    id: `msg-${Math.random().toString(36).substring(2, 10)}`,
  };
}

/**
 * Generate a mock final polish response
 */
export function generateFinalPolishResponse(polishedContent: string): MockAnthropicResponse {
  return {
    content: [{ text: polishedContent }],
    usage: { input_tokens: 2000, output_tokens: 1500 },
    model: 'claude-sonnet-4-5-20250929',
    id: `msg-${Math.random().toString(36).substring(2, 10)}`,
  };
}

/**
 * Generate a mock formatting response
 */
export function generateFormattingResponse(): MockAnthropicResponse {
  return {
    content: [{
      text: JSON.stringify({
        questions: [
          {
            type: 'mcq_single',
            question: 'Sample question?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            explanation: 'Explanation here',
          },
        ],
      }),
    }],
    usage: { input_tokens: 1000, output_tokens: 300 },
    model: 'claude-sonnet-4-5-20250929',
    id: `msg-${Math.random().toString(36).substring(2, 10)}`,
  };
}

// ========================================
// MOCK CLIENT
// ========================================

export interface MockAnthropicClientOptions {
  delay?: number;
  errorRate?: number;
  customResponses?: Map<string, MockAnthropicResponse>;
}

export function createMockAnthropicClient(options: MockAnthropicClientOptions = {}) {
  const { delay = 0, errorRate = 0, customResponses = new Map() } = options;

  async function mockCall(
    model: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<MockAnthropicResponse> {
    // Simulate network delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Simulate random errors
    if (errorRate > 0 && Math.random() < errorRate) {
      throw new Error('Anthropic API error: Rate limit exceeded');
    }

    // Check for custom response
    const lastMessage = messages[messages.length - 1]?.content || '';
    const customKey = `${model}:${lastMessage.slice(0, 50)}`;
    if (customResponses.has(customKey)) {
      return customResponses.get(customKey)!;
    }

    // Determine response type based on prompt content
    if (lastMessage.includes('subject domain')) {
      return generateCourseDetectionResponse();
    }

    if (lastMessage.includes('subtopics are covered')) {
      return generateGapAnalysisResponse();
    }

    if (lastMessage.includes('Generate a single')) {
      const type = lastMessage.includes('mcq_multi') ? 'mcq_multi' : 
                   lastMessage.includes('subjective') ? 'subjective' : 'mcq_single';
      return generateQuestionResponse(type);
    }

    if (lastMessage.includes('Review this')) {
      return generateReviewResponse();
    }

    if (lastMessage.includes('Evaluate')) {
      return generateCriticResponse();
    }

    if (lastMessage.includes('sanitized')) {
      return generateSanitizationResponse('Sanitized content');
    }

    if (lastMessage.includes('improve')) {
      return generateRefinementResponse('Refined content');
    }

    if (lastMessage.includes('polish')) {
      return generateFinalPolishResponse('Polished content');
    }

    if (lastMessage.includes('JSON format')) {
      return generateFormattingResponse();
    }

    // Default content creation
    return generateContentResponse();
  }

  return {
    messages: {
      create: jest.fn(mockCall),
    },
    // Helper methods for testing
    _setCustomResponse: (key: string, response: MockAnthropicResponse) => {
      customResponses.set(key, response);
    },
    _reset: () => {
      customResponses.clear();
    },
  };
}

// ========================================
// RESPONSE MATCHERS
// ========================================

export const AnthropicMatchers = {
  /**
   * Check if a call was made for course detection
   */
  wasCourseDetectionCalled: (calls: unknown[][]): boolean => {
    return calls.some(call => {
      const messages = (call[0] as { messages?: Array<{ content: string }> })?.messages;
      return messages?.some(m => m.content.includes('subject domain'));
    });
  },

  /**
   * Check if a call was made for gap analysis
   */
  wasGapAnalysisCalled: (calls: unknown[][]): boolean => {
    return calls.some(call => {
      const messages = (call[0] as { messages?: Array<{ content: string }> })?.messages;
      return messages?.some(m => m.content.includes('subtopics are covered'));
    });
  },

  /**
   * Check if a call was made for question generation
   */
  wasQuestionGenerationCalled: (calls: unknown[][]): boolean => {
    return calls.some(call => {
      const messages = (call[0] as { messages?: Array<{ content: string }> })?.messages;
      return messages?.some(m => m.content.includes('Generate a single'));
    });
  },

  /**
   * Get total token usage from all calls
   */
  getTotalTokenUsage: (calls: unknown[][]): { input: number; output: number } => {
    return {
      input: calls.length * 500,
      output: calls.length * 300,
    };
  },
};

// ========================================
// TEST HELPERS
// ========================================

/**
 * Setup global fetch mock for Anthropic API
 */
export function setupAnthropicFetchMock() {
  const originalFetch = global.fetch;

  global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlString = url.toString();

    if (urlString.includes('api.anthropic.com')) {
      const body = JSON.parse((init?.body as string) || '{}');
      const { messages } = body;

      // Determine response type
      const lastMessage = messages[messages.length - 1]?.content || '';
      let response: MockAnthropicResponse;

      if (lastMessage.includes('subject domain')) {
        response = generateCourseDetectionResponse();
      } else if (lastMessage.includes('subtopics are covered')) {
        response = generateGapAnalysisResponse();
      } else if (lastMessage.includes('Generate a single')) {
        const type = lastMessage.includes('mcq_multi') ? 'mcq_multi' : 
                     lastMessage.includes('subjective') ? 'subjective' : 'mcq_single';
        response = generateQuestionResponse(type);
      } else if (lastMessage.includes('Review this')) {
        response = generateReviewResponse();
      } else if (lastMessage.includes('Evaluate')) {
        response = generateCriticResponse();
      } else {
        response = generateContentResponse();
      }

      return {
        ok: true,
        status: 200,
        json: async () => response,
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response;
    }

    // Fall back to original fetch for other URLs
    return originalFetch(url, init);
  });

  return () => {
    global.fetch = originalFetch;
  };
}

/**
 * Create a delayed response for testing timeouts
 */
export function createDelayedResponse(delayMs: number): Promise<MockAnthropicResponse> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(generateContentResponse());
    }, delayMs);
  });
}
