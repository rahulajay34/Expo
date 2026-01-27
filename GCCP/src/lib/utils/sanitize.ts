/**
 * Input sanitization utilities
 * Provides functions to sanitize user inputs and prevent XSS attacks
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitize a string for safe use in HTML attributes
 */
export function sanitizeAttribute(value: string): string {
    return value
        .replace(/[<>"'&]/g, '')
        .trim();
}

/**
 * Sanitize user input by removing potentially dangerous content
 * while preserving safe markdown-like formatting
 */
export function sanitizeUserInput(input: string): string {
    if (!input || typeof input !== 'string') return '';

    // Remove script tags and their contents
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers (onclick, onerror, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');

    // Remove javascript: and data: URLs
    sanitized = sanitized.replace(/(?:javascript|data):/gi, '');

    // Remove style tags
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove iframe, object, embed tags
    sanitized = sanitized.replace(/<(iframe|object|embed|form)[^>]*>.*?<\/\1>/gi, '');
    sanitized = sanitized.replace(/<(iframe|object|embed|form)[^>]*\/?>/gi, '');

    return sanitized.trim();
}

/**
 * Sanitize topic/subtopic inputs (more restrictive)
 * Only allows alphanumeric, spaces, and common punctuation
 */
export function sanitizeTopicInput(input: string): string {
    if (!input || typeof input !== 'string') return '';

    // Allow only safe characters for topic/subtopic
    return input
        .replace(/[^\w\s,.-]/g, '')
        .trim()
        .slice(0, 500); // Max length
}

/**
 * Sanitize transcript input (less restrictive but still safe)
 */
export function sanitizeTranscript(input: string): string {
    if (!input || typeof input !== 'string') return '';

    // Remove dangerous tags but allow basic punctuation and formatting
    let sanitized = sanitizeUserInput(input);

    // Limit length to prevent memory issues
    if (sanitized.length > 100000) {
        sanitized = sanitized.slice(0, 100000) + '\n\n[Transcript truncated - max 100k characters]';
    }

    return sanitized;
}

/**
 * Validate and sanitize JSON content
 */
export function sanitizeJsonContent(input: string): string {
    if (!input || typeof input !== 'string') return '[]';

    try {
        // Parse to ensure it's valid JSON
        const parsed = JSON.parse(input);
        // Re-stringify to normalize
        return JSON.stringify(parsed);
    } catch {
        // If not valid JSON, return empty array
        return '[]';
    }
}

/**
 * Strip markdown for plain text display
 */
export function stripMarkdown(text: string): string {
    if (!text) return '';

    return text
        // Remove headers
        .replace(/^#{1,6}\s+/gm, '')
        // Remove emphasis
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code
        .replace(/`([^`]+)`/g, '$1')
        // Remove links but keep text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove images
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        // Remove blockquotes
        .replace(/^>\s+/gm, '')
        // Remove horizontal rules
        .replace(/^---+$/gm, '')
        // Normalize whitespace
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
