import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  AppError,
  StorageFullError,
  TimeoutError,
  ParseError,
  AIProviderError,
  RateLimitError,
} from './errors';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof StorageFullError) {
    return 'Storage is full — free up space and try again.';
  }
  if (err instanceof RateLimitError) {
    return err.retryAfter
      ? `Rate limit exceeded. Try again in ${err.retryAfter} seconds.`
      : 'Rate limit exceeded. Please wait before trying again.';
  }
  if (err instanceof TimeoutError) {
    return 'The request timed out. Please try again.';
  }
  if (err instanceof ParseError) {
    return err.message || 'Failed to parse the provided file.';
  }
  if (err instanceof AIProviderError) {
    return err.message || 'The AI provider returned an error. Please try again.';
  }
  if (err instanceof AppError) {
    return err.message;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'An unknown error occurred';
}

export function formatDate(dateStr?: string): string {
  try {
    const d = new Date(dateStr ?? '');
    if (isNaN(d.getTime())) return 'Unknown date';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Unknown date';
  }
}

const MAX_PROMPT_INPUT_LEN = 10000;

/** Strip null bytes + control chars + collapse 3+ newlines, then truncate to maxLen (default 10000). */
export function sanitizeShortInput(input: string, maxLen = MAX_PROMPT_INPUT_LEN): string {
  let sanitized = input;

  // Strip null bytes and control characters except \n and \t
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Collapse 3+ newlines into 2
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // Trim
  sanitized = sanitized.trim();

  // Warn and truncate if over limit
  if (sanitized.length > maxLen) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[sanitizeShortInput] Input truncated from ${sanitized.length} to ${maxLen} chars`);
    }
    sanitized = sanitized.slice(0, maxLen);
  }

  return sanitized;
}

/** Strip null bytes + control chars + collapse 3+ newlines. No truncation. */
export function sanitizeTranscript(input: string): string {
  let sanitized = input;

  // Strip null bytes and control characters except \n and \t
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Collapse 3+ newlines into 2
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // Trim
  sanitized = sanitized.trim();

  return sanitized;
}

/** Backward-compatible wrapper — delegates to sanitizeShortInput. */
export function sanitizeForPrompt(input: string): string {
  return sanitizeShortInput(input);
}

/** Copy text to clipboard with fallback for non-secure contexts. */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
