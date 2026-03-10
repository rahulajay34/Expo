// =============================================================================
// GCCP — Auto-tag generation utility
// Extracts meaningful tags from topic, subtopics, and content type.
// =============================================================================

import type { ContentType } from '@/lib/types';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';

/** Common stop words to skip when extracting tags from the topic string. */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'of', 'to', 'for', 'and', 'or', 'on', 'at',
  'by', 'is', 'it', 'its', 'as', 'be', 'are', 'was', 'were', 'with',
  'from', 'this', 'that', 'but', 'not', 'has', 'have', 'had', 'do',
  'does', 'did', 'will', 'would', 'can', 'could', 'shall', 'should',
  'may', 'might', 'about', 'into', 'over', 'after', 'before', 'between',
  'under', 'above', 'below', 'up', 'down', 'out', 'off', 'then', 'than',
  'so', 'no', 'yes', 'how', 'what', 'when', 'where', 'who', 'which',
  'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some',
  'any', 'such', 'only', 'very', 'just', 'also', 'using', 'through',
  'during', 'introduction', 'overview', 'basics',
]);

/** Maximum number of auto-generated tags. */
const MAX_TAGS = 6;

/**
 * Capitalize a word (first letter uppercase, rest lowercase).
 */
function capitalize(word: string): string {
  if (word.length === 0) return word;
  // Keep all-uppercase acronyms (e.g. "AI", "ML", "CSS") as-is
  if (word.length <= 4 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Generate tags from a topic string, subtopics, and content type.
 *
 * Strategy:
 * 1. Always include the content type label as the first tag.
 * 2. Split the topic into words, filter out stop words & short words,
 *    capitalize each, and take up to 4.
 * 3. If we have room, take up to 1 tag from the first subtopic.
 * 4. Cap at MAX_TAGS total, deduplicate.
 */
export function generateTags(
  topic: string,
  subtopics: string[],
  contentType: ContentType,
): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();

  const addTag = (tag: string) => {
    const normalized = tag.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    if (tags.length >= MAX_TAGS) return;
    seen.add(key);
    tags.push(normalized);
  };

  // 1. Content type label
  addTag(CONTENT_TYPE_LABELS[contentType]);

  // 2. Topic words
  const topicWords = topic
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()))
    .map(capitalize);

  for (const word of topicWords) {
    addTag(word);
  }

  // 3. First subtopic if room remains
  if (subtopics.length > 0 && tags.length < MAX_TAGS) {
    const firstSub = subtopics[0]
      .replace(/[^a-zA-Z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()))
      .map(capitalize);

    for (const word of firstSub) {
      addTag(word);
    }
  }

  return tags;
}
