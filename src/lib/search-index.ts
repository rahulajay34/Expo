import { ContentItem } from './types';

export type SearchIndex = Map<string, Set<string>>;

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'its', 'be', 'as', 'was',
  'are', 'were', 'has', 'have', 'had', 'not', 'this', 'that', 'they',
  'their', 'there', 'what', 'which', 'who', 'how', 'when', 'where',
  'can', 'will', 'would', 'could', 'should', 'may', 'might', 'do',
  'does', 'did', 'so', 'if', 'then', 'than', 'no', 'up', 'out', 'all',
]);

function tokenize(text: string): string[] {
  // Split on whitespace and common punctuation (no unicode flag for compatibility)
  return text
    .toLowerCase()
    .split(/[\s.,;:!?'"()\[\]{}<>\-_/\\|@#$%^&*+=~`]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function buildIndex(items: ContentItem[]): SearchIndex {
  const index: SearchIndex = new Map();

  for (const item of items) {
    const text = [
      item.title ?? '',
      item.metadata?.topic ?? '',
      item.markdown?.slice(0, 500) ?? '',
    ].join(' ');

    for (const token of tokenize(text)) {
      if (!index.has(token)) index.set(token, new Set());
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      index.get(token)!.add(item.id);
    }
  }

  return index;
}

/**
 * Returns content IDs matching the query, ranked by hit count (most hits first).
 * Returns an empty array if the query is blank.
 */
export function search(index: SearchIndex, query: string): string[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const hitCount: Record<string, number> = {};

  for (const token of tokens) {
    // Exact match (weight 2)
    const exact = index.get(token);
    if (exact) {
      exact.forEach((id) => {
        hitCount[id] = (hitCount[id] ?? 0) + 2;
      });
    }
    // Prefix match (weight 1) for partial queries
    index.forEach((ids, key) => {
      if (key !== token && key.startsWith(token)) {
        ids.forEach((id) => {
          hitCount[id] = (hitCount[id] ?? 0) + 1;
        });
      }
    });
  }

  return Object.entries(hitCount)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
