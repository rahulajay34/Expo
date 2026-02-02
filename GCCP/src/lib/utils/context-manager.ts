/**
 * Context Manager - Intelligent context pruning for agentic workflows
 * 
 * Per the Agentic AI Framework:
 * - "Needle in a Haystack" problem: recall degrades as context grows
 * - Context is a finite resource with diminishing marginal returns
 * - Pruning and summarization strategies are mandatory
 * 
 * This module provides progressive context compression to maintain
 * high signal-to-noise ratio throughout multi-agent pipelines.
 */

import { estimateTokens } from '@/lib/anthropic/token-counter';

export interface ContextBudget {
  maxTokens: number;           // Total context window budget
  reservedForSystem: number;   // Tokens reserved for system prompt
  reservedForOutput: number;   // Tokens reserved for response
  targetUtilization: number;   // Target % of budget to use (0.7-0.9)
}

export interface ContentChunk {
  id: string;
  content: string;
  tokens: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
  timestamp: number;
  metadata?: Record<string, any>;
}

const DEFAULT_BUDGET: ContextBudget = {
  maxTokens: 100000,      // Claude's context window
  reservedForSystem: 5000,
  reservedForOutput: 8000,
  targetUtilization: 0.8,
};

/**
 * Calculate available tokens for content
 */
export function getAvailableTokens(budget: ContextBudget = DEFAULT_BUDGET): number {
  const usable = budget.maxTokens - budget.reservedForSystem - budget.reservedForOutput;
  return Math.floor(usable * budget.targetUtilization);
}

/**
 * Prune content to fit within token budget while preserving critical information
 */
export function pruneContent(
  content: string,
  maxTokens: number,
  options: {
    preserveStart?: number;    // Tokens to preserve from start
    preserveEnd?: number;      // Tokens to preserve from end
    summaryRatio?: number;     // Ratio of middle content to summarize (0.3 = 30%)
  } = {}
): { prunedContent: string; originalTokens: number; prunedTokens: number; wasModified: boolean } {
  const originalTokens = estimateTokens(content);
  
  if (originalTokens <= maxTokens) {
    return { prunedContent: content, originalTokens, prunedTokens: originalTokens, wasModified: false };
  }

  const {
    preserveStart = Math.floor(maxTokens * 0.3),
    preserveEnd = Math.floor(maxTokens * 0.3),
    summaryRatio = 0.4
  } = options;

  // Estimate chars per token (rough: 4 chars/token)
  const charsPerToken = 4;
  const startChars = preserveStart * charsPerToken;
  const endChars = preserveEnd * charsPerToken;

  const startContent = content.slice(0, startChars);
  const endContent = content.slice(-endChars);
  
  // Middle content gets summarized/truncated
  const middleTokenBudget = maxTokens - preserveStart - preserveEnd - 50; // 50 for separator
  const middleContent = content.slice(startChars, -endChars);
  
  // Smart truncation: find paragraph/sentence boundaries
  let truncatedMiddle = '';
  if (middleTokenBudget > 100) {
    const middleChars = middleTokenBudget * charsPerToken;
    const halfChars = Math.floor(middleChars / 2);
    
    // Take from start and end of middle section
    const middleStart = middleContent.slice(0, halfChars);
    const middleEnd = middleContent.slice(-halfChars);
    
    // Find clean break points (paragraph or sentence)
    const cleanStart = findCleanBreak(middleStart, 'end');
    const cleanEnd = findCleanBreak(middleEnd, 'start');
    
    truncatedMiddle = cleanStart + '\n\n[... content condensed for context efficiency ...]\n\n' + cleanEnd;
  }

  const prunedContent = startContent + truncatedMiddle + endContent;
  const prunedTokens = estimateTokens(prunedContent);

  return { prunedContent, originalTokens, prunedTokens, wasModified: true };
}

/**
 * Find a clean break point (paragraph or sentence boundary)
 */
function findCleanBreak(text: string, direction: 'start' | 'end'): string {
  if (direction === 'end') {
    // Find last paragraph or sentence break
    const paragraphBreak = text.lastIndexOf('\n\n');
    if (paragraphBreak > text.length * 0.7) {
      return text.slice(0, paragraphBreak);
    }
    
    const sentenceBreak = text.lastIndexOf('. ');
    if (sentenceBreak > text.length * 0.8) {
      return text.slice(0, sentenceBreak + 1);
    }
    
    return text;
  } else {
    // Find first paragraph or sentence break
    const paragraphBreak = text.indexOf('\n\n');
    if (paragraphBreak > 0 && paragraphBreak < text.length * 0.3) {
      return text.slice(paragraphBreak + 2);
    }
    
    const sentenceBreak = text.indexOf('. ');
    if (sentenceBreak > 0 && sentenceBreak < text.length * 0.2) {
      return text.slice(sentenceBreak + 2);
    }
    
    return text;
  }
}

/**
 * Extract key points from content for summarization
 */
export function extractKeyPoints(content: string, maxPoints: number = 5): string[] {
  const lines = content.split('\n').filter(l => l.trim());
  const keyPoints: string[] = [];
  
  // Priority 1: Headers (## and ###)
  const headers = lines.filter(l => l.match(/^#{1,3}\s/));
  keyPoints.push(...headers.slice(0, Math.min(2, maxPoints)));
  
  // Priority 2: Bold statements
  const boldStatements = lines.filter(l => l.includes('**') && l.length < 200);
  for (const stmt of boldStatements) {
    if (keyPoints.length >= maxPoints) break;
    if (!keyPoints.includes(stmt)) keyPoints.push(stmt);
  }
  
  // Priority 3: First sentences of paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim() && p.length > 50);
  for (const para of paragraphs) {
    if (keyPoints.length >= maxPoints) break;
    const firstSentence = para.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length > 20 && firstSentence.length < 150) {
      if (!keyPoints.some(kp => kp.includes(firstSentence.slice(0, 30)))) {
        keyPoints.push(firstSentence.trim() + '.');
      }
    }
  }
  
  return keyPoints.slice(0, maxPoints);
}

/**
 * Create a distilled summary of content for context compression
 */
export function createDistilledSummary(content: string, maxTokens: number = 500): string {
  const keyPoints = extractKeyPoints(content, 7);
  
  if (keyPoints.length === 0) {
    // Fallback: just truncate intelligently
    const { prunedContent } = pruneContent(content, maxTokens);
    return prunedContent;
  }
  
  const summary = [
    '[CONTEXT SUMMARY]',
    ...keyPoints.map((point, i) => `${i + 1}. ${point.replace(/^#+\s*/, '')}`),
    '[END SUMMARY]'
  ].join('\n');
  
  return summary;
}

/**
 * Progressive context manager for multi-turn conversations
 */
export class ContextManager {
  private chunks: ContentChunk[] = [];
  private budget: ContextBudget;
  
  constructor(budget: Partial<ContextBudget> = {}) {
    this.budget = { ...DEFAULT_BUDGET, ...budget };
  }
  
  /**
   * Add content chunk with importance level
   */
  addChunk(
    id: string,
    content: string,
    importance: ContentChunk['importance'] = 'medium',
    metadata?: Record<string, any>
  ): void {
    const tokens = estimateTokens(content);
    this.chunks.push({
      id,
      content,
      tokens,
      importance,
      timestamp: Date.now(),
      metadata,
    });
    
    this.optimizeIfNeeded();
  }
  
  /**
   * Update existing chunk
   */
  updateChunk(id: string, content: string): void {
    const idx = this.chunks.findIndex(c => c.id === id);
    if (idx >= 0) {
      this.chunks[idx].content = content;
      this.chunks[idx].tokens = estimateTokens(content);
      this.chunks[idx].timestamp = Date.now();
    }
  }
  
  /**
   * Get optimized context string
   */
  getOptimizedContext(): string {
    // Sort by importance then timestamp
    const sorted = [...this.chunks].sort((a, b) => {
      const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
      if (impDiff !== 0) return impDiff;
      return b.timestamp - a.timestamp; // Newer first within same importance
    });
    
    const available = getAvailableTokens(this.budget);
    let usedTokens = 0;
    const includedChunks: ContentChunk[] = [];
    
    for (const chunk of sorted) {
      if (usedTokens + chunk.tokens <= available) {
        includedChunks.push(chunk);
        usedTokens += chunk.tokens;
      } else if (chunk.importance === 'critical') {
        // Critical chunks get pruned but included
        const { prunedContent, prunedTokens } = pruneContent(
          chunk.content,
          available - usedTokens - 100
        );
        if (prunedTokens > 50) {
          includedChunks.push({ ...chunk, content: prunedContent, tokens: prunedTokens });
          usedTokens += prunedTokens;
        }
      }
    }
    
    // Re-sort by original order (timestamp)
    includedChunks.sort((a, b) => a.timestamp - b.timestamp);
    
    return includedChunks.map(c => c.content).join('\n\n');
  }
  
  /**
   * Optimize chunks if over budget
   */
  private optimizeIfNeeded(): void {
    const totalTokens = this.chunks.reduce((sum, c) => sum + c.tokens, 0);
    const available = getAvailableTokens(this.budget);
    
    if (totalTokens <= available) return;
    
    console.info(`📦 Context optimization triggered: ${totalTokens} tokens → ${available} budget`);
    
    // Step 1: Summarize low importance chunks
    for (let i = 0; i < this.chunks.length; i++) {
      if (this.chunks[i].importance === 'low' && this.chunks[i].tokens > 500) {
        const summary = createDistilledSummary(this.chunks[i].content, 200);
        this.chunks[i].content = summary;
        this.chunks[i].tokens = estimateTokens(summary);
      }
    }
    
    // Step 2: Remove oldest low importance if still over
    const newTotal = this.chunks.reduce((sum, c) => sum + c.tokens, 0);
    if (newTotal > available) {
      this.chunks = this.chunks.filter(c => c.importance !== 'low');
    }
    
    // Step 3: Prune medium importance chunks if still over
    const finalTotal = this.chunks.reduce((sum, c) => sum + c.tokens, 0);
    if (finalTotal > available) {
      for (let i = 0; i < this.chunks.length; i++) {
        if (this.chunks[i].importance === 'medium' && this.chunks[i].tokens > 1000) {
          const { prunedContent, prunedTokens } = pruneContent(
            this.chunks[i].content,
            Math.floor(this.chunks[i].tokens * 0.5)
          );
          this.chunks[i].content = prunedContent;
          this.chunks[i].tokens = prunedTokens;
        }
      }
    }
  }
  
  /**
   * Get current token usage
   */
  getTokenUsage(): { used: number; available: number; utilization: number } {
    const used = this.chunks.reduce((sum, c) => sum + c.tokens, 0);
    const available = getAvailableTokens(this.budget);
    return {
      used,
      available,
      utilization: used / available,
    };
  }
  
  /**
   * Clear all chunks
   */
  clear(): void {
    this.chunks = [];
  }
}

/**
 * Utility to prepare content for refiner with context pruning
 */
export function prepareRefinerContext(
  currentContent: string,
  feedback: string,
  previousIssues: string[],
  loopCount: number
): { content: string; feedback: string; wasPruned: boolean } {
  const contentTokens = estimateTokens(currentContent);
  const feedbackTokens = estimateTokens(feedback);
  
  // Budget for refiner: leave room for system prompt and output
  const maxContentTokens = 15000;
  const maxFeedbackTokens = 2000;
  
  let prunedContent = currentContent;
  let prunedFeedback = feedback;
  let wasPruned = false;
  
  // Prune content if needed
  if (contentTokens > maxContentTokens) {
    const result = pruneContent(currentContent, maxContentTokens, {
      preserveStart: Math.floor(maxContentTokens * 0.4),
      preserveEnd: Math.floor(maxContentTokens * 0.4),
    });
    prunedContent = result.prunedContent;
    wasPruned = true;
    console.info(`📦 Refiner content pruned: ${contentTokens} → ${result.prunedTokens} tokens`);
  }
  
  // For loop 2+, include summarized previous issues
  if (loopCount > 1 && previousIssues.length > 0) {
    const issuesSummary = previousIssues.slice(0, 3).join('; ');
    prunedFeedback = `${feedback}\n\n[PREVIOUS LOOP CONTEXT]: ${issuesSummary}`;
  }
  
  // Prune feedback if needed
  if (estimateTokens(prunedFeedback) > maxFeedbackTokens) {
    const result = pruneContent(prunedFeedback, maxFeedbackTokens);
    prunedFeedback = result.prunedContent;
    wasPruned = true;
  }
  
  return { content: prunedContent, feedback: prunedFeedback, wasPruned };
}
