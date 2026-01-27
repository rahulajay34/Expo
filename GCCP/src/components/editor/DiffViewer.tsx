'use client';

import { useMemo } from 'react';

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber: number;
}

interface DiffViewerProps {
  before: string;
  after: string;
  maxLines?: number;
}

/**
 * Simple diff viewer component for showing before/after content changes
 * Used to visualize what the Refiner agent changed
 */
export function DiffViewer({ before, after, maxLines = 50 }: DiffViewerProps) {
  const diff = useMemo(() => computeSimpleDiff(before, after, maxLines), [before, after, maxLines]);
  
  if (diff.additions === 0 && diff.deletions === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
        No changes detected
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">Changes by Refiner</span>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-600 font-medium">+{diff.additions} added</span>
          <span className="text-red-600 font-medium">-{diff.deletions} removed</span>
        </div>
      </div>
      
      {/* Diff content */}
      <div className="max-h-96 overflow-y-auto font-mono text-xs">
        {diff.lines.map((line, idx) => (
          <div
            key={idx}
            className={`px-4 py-0.5 flex gap-3 ${
              line.type === 'added' ? 'bg-green-50 text-green-800' :
              line.type === 'removed' ? 'bg-red-50 text-red-800' :
              'text-gray-600'
            }`}
          >
            <span className={`w-8 text-right flex-shrink-0 ${
              line.type === 'added' ? 'text-green-500' :
              line.type === 'removed' ? 'text-red-500' :
              'text-gray-400'
            }`}>
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              {line.lineNumber}
            </span>
            <span className="flex-1 whitespace-pre-wrap break-all">{line.content || ' '}</span>
          </div>
        ))}
      </div>
      
      {diff.truncated && (
        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200 text-center">
          Showing first {maxLines} lines of changes...
        </div>
      )}
    </div>
  );
}

/**
 * Simple line-by-line diff algorithm
 * For production, consider using a proper diff library like 'diff'
 */
function computeSimpleDiff(before: string, after: string, maxLines: number) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  
  const result: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  let truncated = false;
  
  // Use longest common subsequence for better diff
  const lcs = findLCS(beforeLines, afterLines);
  
  let beforeIdx = 0;
  let afterIdx = 0;
  let lineNum = 1;
  
  for (const match of lcs) {
    // Add removed lines (in before but not matched)
    while (beforeIdx < match.beforeIdx && result.length < maxLines) {
      result.push({ type: 'removed', content: beforeLines[beforeIdx], lineNumber: lineNum++ });
      deletions++;
      beforeIdx++;
    }
    
    // Add added lines (in after but not matched)
    while (afterIdx < match.afterIdx && result.length < maxLines) {
      result.push({ type: 'added', content: afterLines[afterIdx], lineNumber: lineNum++ });
      additions++;
      afterIdx++;
    }
    
    // Add unchanged line
    if (result.length < maxLines) {
      result.push({ type: 'unchanged', content: match.content, lineNumber: lineNum++ });
    }
    beforeIdx++;
    afterIdx++;
  }
  
  // Handle remaining lines
  while (beforeIdx < beforeLines.length && result.length < maxLines) {
    result.push({ type: 'removed', content: beforeLines[beforeIdx], lineNumber: lineNum++ });
    deletions++;
    beforeIdx++;
  }
  
  while (afterIdx < afterLines.length && result.length < maxLines) {
    result.push({ type: 'added', content: afterLines[afterIdx], lineNumber: lineNum++ });
    additions++;
    afterIdx++;
  }
  
  if (result.length >= maxLines) {
    truncated = true;
  }
  
  return { lines: result, additions, deletions, truncated };
}

/**
 * Find longest common subsequence for line matching
 */
function findLCS(a: string[], b: string[]): Array<{ beforeIdx: number; afterIdx: number; content: string }> {
  const m = a.length;
  const n = b.length;
  
  // DP table
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find the actual LCS
  const result: Array<{ beforeIdx: number; afterIdx: number; content: string }> = [];
  let i = m, j = n;
  
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift({ beforeIdx: i - 1, afterIdx: j - 1, content: a[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return result;
}
