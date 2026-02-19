function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  if (len1 === 0 && len2 === 0) return 1;
  if (len1 === 0 || len2 === 0) return 0;

  if (len1 > 1000 || len2 > 1000) {
    return trigramSimilarity(str1, str2);
  }

  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return 1 - matrix[len1][len2] / Math.max(len1, len2);
}

function trigramSimilarity(str1: string, str2: string): number {
  const getTrigrams = (s: string): Set<string> => {
    const trigrams = new Set<string>();
    const normalized = s.toLowerCase().replace(/\s+/g, ' ');
    for (let i = 0; i < normalized.length - 2; i++) {
      trigrams.add(normalized.substring(i, i + 3));
    }
    return trigrams;
  };
  const t1 = getTrigrams(str1);
  const t2 = getTrigrams(str2);
  let intersection = 0;
  for (const t of t1) if (t2.has(t)) intersection++;
  const union = t1.size + t2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function splitIntoBlocks(content: string): string[] {
  return content
    .split(/(?:\n\n+|(?=^#{1,6}\s))/m)
    .map((b) => b.trim())
    .filter((b) => b.length > 20);
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function deduplicateContent(
  content: string,
  similarityThreshold = 0.85
): { content: string; removedCount: number } {
  const blocks = splitIntoBlocks(content);
  const removedIndices = new Set<number>();

  for (let i = 0; i < blocks.length; i++) {
    if (removedIndices.has(i)) continue;
    for (let j = i + 1; j < blocks.length; j++) {
      if (removedIndices.has(j)) continue;
      const n1 = normalizeForComparison(blocks[i]);
      const n2 = normalizeForComparison(blocks[j]);
      if (n1.length < 50 || n2.length < 50) continue;
      if (calculateSimilarity(n1, n2) >= similarityThreshold) {
        removedIndices.add(j);
      }
    }
  }

  if (removedIndices.size === 0) return { content, removedCount: 0 };

  let result = content;
  const sorted = Array.from(removedIndices).sort((a, b) => b - a);
  for (const idx of sorted) {
    if (result.includes(blocks[idx])) {
      result = result.replace(blocks[idx], '');
    }
  }

  return {
    content: result.replace(/\n{3,}/g, '\n\n').trim(),
    removedCount: removedIndices.size,
  };
}

export function deduplicateHeaders(content: string): string {
  const seenHeaders = new Set<string>();
  return content
    .replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes: string, title: string) => {
      const normalized = `${hashes.length}:${title.trim().toLowerCase()}`;
      if (seenHeaders.has(normalized)) return '';
      seenHeaders.add(normalized);
      return match;
    })
    .replace(/\n{3,}/g, '\n\n');
}
