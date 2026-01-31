/**
 * Subtopic Normalizer Utility
 * Handles multiline and comma-separated subtopic inputs consistently across the application.
 * 
 * Input formats supported:
 * - Comma-separated: "Topic1, Topic2, Topic3"
 * - Newline-separated: "Topic1\nTopic2\nTopic3"
 * - Mixed: "Topic1, Topic2\nTopic3, Topic4"
 * - With extra whitespace/blank lines
 */

export interface NormalizedSubtopics {
  /** Array of individual subtopics */
  list: string[];
  /** Comma-separated string for display/API */
  commaSeparated: string;
  /** Newline-separated string for display */
  newlineSeparated: string;
  /** Original input preserved */
  original: string;
  /** Count of subtopics */
  count: number;
}

/**
 * Normalizes subtopics input from various formats into a consistent structure
 * @param input - Raw subtopics input (multiline or comma-separated)
 * @returns NormalizedSubtopics object with various representations
 */
export function normalizeSubtopics(input: string): NormalizedSubtopics {
  if (!input || typeof input !== 'string') {
    return {
      list: [],
      commaSeparated: '',
      newlineSeparated: '',
      original: input || '',
      count: 0
    };
  }

  // Split on newlines OR commas, trim each item, filter empty strings
  const list = input
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return {
    list,
    commaSeparated: list.join(', '),
    newlineSeparated: list.join('\n'),
    original: input,
    count: list.length
  };
}

/**
 * Parses subtopics and returns just the array
 * @param input - Raw subtopics input
 * @returns Array of subtopic strings
 */
export function parseSubtopicsList(input: string): string[] {
  return normalizeSubtopics(input).list;
}

/**
 * Validates subtopics input
 * @param input - Raw subtopics input  
 * @returns Validation result with error message if invalid
 */
export function validateSubtopics(input: string): { valid: boolean; error?: string; count: number } {
  const normalized = normalizeSubtopics(input);
  
  if (normalized.count === 0) {
    return { valid: false, error: 'At least one subtopic is required', count: 0 };
  }
  
  // Check for excessively long subtopics (likely malformed input)
  const tooLong = normalized.list.filter(s => s.length > 200);
  if (tooLong.length > 0) {
    return { 
      valid: false, 
      error: `Some subtopics are too long (>200 chars). Please use shorter descriptions.`,
      count: normalized.count 
    };
  }
  
  return { valid: true, count: normalized.count };
}

/**
 * Formats subtopics for prompt injection
 * Creates a numbered list suitable for LLM prompts
 * @param input - Raw subtopics input
 * @returns Formatted string for prompts
 */
export function formatSubtopicsForPrompt(input: string): string {
  const { list } = normalizeSubtopics(input);
  return list.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

/**
 * Sanitizes subtopics by removing special characters that could break prompts
 * @param input - Raw subtopics input
 * @returns Sanitized subtopics string (comma-separated)
 */
export function sanitizeSubtopics(input: string): string {
  const { list } = normalizeSubtopics(input);
  
  // Remove any characters that could cause prompt injection or parsing issues
  const sanitized = list.map(s => 
    s.replace(/[<>{}[\]\\]/g, '')  // Remove potentially dangerous chars
     .replace(/\s+/g, ' ')         // Normalize whitespace
     .trim()
  ).filter(s => s.length > 0);
  
  return sanitized.join(', ');
}
