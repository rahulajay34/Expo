/**
 * Text Deduplication Utility
 * Detects and removes duplicate paragraphs or sections from generated content.
 * Used as post-processing to handle streaming stutters or model output buffer issues.
 */

/**
 * Calculate similarity between two strings using Levenshtein distance.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Quick checks
  if (len1 === 0 && len2 === 0) return 1;
  if (len1 === 0 || len2 === 0) return 0;
  
  // For very long strings, use a simplified comparison for performance
  if (len1 > 1000 || len2 > 1000) {
    // Use trigram similarity for long strings (faster approximation)
    return trigramSimilarity(str1, str2);
  }
  
  // Levenshtein distance matrix
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Trigram similarity for faster comparison of long strings.
 */
function trigramSimilarity(str1: string, str2: string): number {
  const getTrigrams = (s: string): Set<string> => {
    const trigrams = new Set<string>();
    const normalized = s.toLowerCase().replace(/\s+/g, ' ');
    for (let i = 0; i < normalized.length - 2; i++) {
      trigrams.add(normalized.substring(i, i + 3));
    }
    return trigrams;
  };
  
  const trigrams1 = getTrigrams(str1);
  const trigrams2 = getTrigrams(str2);
  
  let intersection = 0;
  for (const trigram of trigrams1) {
    if (trigrams2.has(trigram)) intersection++;
  }
  
  const union = trigrams1.size + trigrams2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Split content into meaningful blocks (paragraphs, headers, etc.)
 */
function splitIntoBlocks(content: string): string[] {
  // Split by double newlines (paragraphs) or markdown headers
  const blocks = content
    .split(/(?:\n\n+|(?=^#{1,6}\s))/m)
    .map(block => block.trim())
    .filter(block => block.length > 20); // Only consider meaningful blocks
  
  return blocks;
}

/**
 * Normalize text for comparison (lowercase, remove extra whitespace)
 */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect duplicate or highly similar blocks in content.
 * @param content The content to analyze
 * @param similarityThreshold Minimum similarity (0-1) to consider as duplicate (default: 0.85)
 * @returns Array of duplicate block pairs with their similarity scores
 */
export function detectDuplicates(
  content: string,
  similarityThreshold: number = 0.85
): Array<{ block1Index: number; block2Index: number; similarity: number; block1: string; block2: string }> {
  const blocks = splitIntoBlocks(content);
  const duplicates: Array<{ block1Index: number; block2Index: number; similarity: number; block1: string; block2: string }> = [];
  
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const norm1 = normalizeForComparison(blocks[i]);
      const norm2 = normalizeForComparison(blocks[j]);
      
      // Skip very short blocks
      if (norm1.length < 50 || norm2.length < 50) continue;
      
      const similarity = calculateSimilarity(norm1, norm2);
      
      if (similarity >= similarityThreshold) {
        duplicates.push({
          block1Index: i,
          block2Index: j,
          similarity,
          block1: blocks[i],
          block2: blocks[j]
        });
      }
    }
  }
  
  return duplicates;
}

/**
 * Remove duplicate blocks from content, keeping the first occurrence.
 * @param content The content to deduplicate
 * @param similarityThreshold Minimum similarity (0-1) to consider as duplicate (default: 0.85)
 * @returns Deduplicated content
 */
export function deduplicateContent(
  content: string,
  similarityThreshold: number = 0.85
): { content: string; removedCount: number; removedBlocks: string[] } {
  const blocks = splitIntoBlocks(content);
  const removedIndices = new Set<number>();
  const removedBlocks: string[] = [];
  
  // Find duplicates and mark later occurrences for removal
  for (let i = 0; i < blocks.length; i++) {
    if (removedIndices.has(i)) continue;
    
    for (let j = i + 1; j < blocks.length; j++) {
      if (removedIndices.has(j)) continue;
      
      const norm1 = normalizeForComparison(blocks[i]);
      const norm2 = normalizeForComparison(blocks[j]);
      
      // Skip very short blocks
      if (norm1.length < 50 || norm2.length < 50) continue;
      
      const similarity = calculateSimilarity(norm1, norm2);
      
      if (similarity >= similarityThreshold) {
        removedIndices.add(j);
        removedBlocks.push(blocks[j].substring(0, 100) + '...');
      }
    }
  }
  
  if (removedIndices.size === 0) {
    return { content, removedCount: 0, removedBlocks: [] };
  }
  
  // Reconstruct content without duplicates
  // We need to find and remove the actual duplicate blocks from the original content
  let result = content;
  
  // Sort indices in reverse order to remove from end first (preserves earlier indices)
  const sortedIndices = Array.from(removedIndices).sort((a, b) => b - a);
  
  for (const idx of sortedIndices) {
    const blockToRemove = blocks[idx];
    // Only remove if it actually appears (could have been modified already)
    if (result.includes(blockToRemove)) {
      result = result.replace(blockToRemove, '');
    }
  }
  
  // Clean up excessive whitespace
  result = result.replace(/\n{3,}/g, '\n\n').trim();
  
  return {
    content: result,
    removedCount: removedIndices.size,
    removedBlocks
  };
}

/**
 * Check if content has potential duplicates without modifying it.
 * Useful for quick checks before full deduplication.
 */
export function hasPotentialDuplicates(content: string, similarityThreshold: number = 0.85): boolean {
  return detectDuplicates(content, similarityThreshold).length > 0;
}

/**
 * Remove exact duplicate headers from content.
 * Headers appearing multiple times identically are reduced to first occurrence.
 */
export function deduplicateHeaders(content: string): string {
  const headerPattern = /^(#{1,6})\s+(.+)$/gm;
  const seenHeaders = new Set<string>();
  
  return content.replace(headerPattern, (match, hashes, title) => {
    const normalized = `${hashes.length}:${title.trim().toLowerCase()}`;
    if (seenHeaders.has(normalized)) {
      return ''; // Remove duplicate header
    }
    seenHeaders.add(normalized);
    return match;
  }).replace(/\n{3,}/g, '\n\n');
}
