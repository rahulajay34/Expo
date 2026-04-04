'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { parseAssignmentMarkdown } from '@/lib/export/csv';
import { CSVRow } from '@/lib/types';
import { MarkdownPreview } from './MarkdownPreview';
import { cn } from '@/lib/utils';

interface DisplayQuestion {
  number: number;
  type: 'MCQ' | 'MSQ' | 'Subjective';
  difficulty: string;
  body: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

function mapRowToDisplay(row: CSVRow, index: number): DisplayQuestion {
  const type: DisplayQuestion['type'] =
    row.questionType === 'mcsc' ? 'MCQ' :
    row.questionType === 'mcmc' ? 'MSQ' : 'Subjective';

  const options: { label: string; text: string }[] = [];
  if (type !== 'Subjective') {
    if (row['option.1']) options.push({ label: 'A', text: row['option.1'] });
    if (row['option.2']) options.push({ label: 'B', text: row['option.2'] });
    if (row['option.3']) options.push({ label: 'C', text: row['option.3'] });
    if (row['option.4']) options.push({ label: 'D', text: row['option.4'] });
  }

  // Map correct answer back to letters
  let correctAnswer = '';
  if (type === 'MCQ' && row.mcscAnswer) {
    const num = parseInt(row.mcscAnswer);
    if (!isNaN(num)) correctAnswer = String.fromCharCode(64 + num);
  } else if (type === 'MSQ' && row.mcmcAnswer) {
    correctAnswer = row.mcmcAnswer
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(n => String.fromCharCode(64 + parseInt(n)))
      .join(', ');
  }

  // Map difficulty from 0/0.5/1 to Easy/Medium/Hard
  const diffVal = parseFloat(row.difficultyLevel);
  const difficulty = diffVal <= 0 ? 'Easy' : diffVal < 1 ? 'Medium' : 'Hard';

  return {
    number: index + 1,
    type,
    difficulty,
    body: row.contentBody,
    options,
    correctAnswer,
    explanation: row.answerExplanation,
  };
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const TYPE_COLORS: Record<string, string> = {
  MCQ: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MSQ: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Subjective: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

interface AssignmentViewerProps {
  markdown: string;
}

export function AssignmentViewer({ markdown }: AssignmentViewerProps) {
  const rows = useMemo(() => parseAssignmentMarkdown(markdown), [markdown]);
  const questions = useMemo(() => rows.map(mapRowToDisplay), [rows]);
  const [activeIndex, setActiveIndex] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const detailRef = useRef<HTMLDivElement>(null);

  // Reset active index when questions change
  useEffect(() => {
    setActiveIndex(0);
  }, [questions.length]);

  // Scroll sidebar item into view
  useEffect(() => {
    const item = itemRefs.current[activeIndex];
    if (item && sidebarRef.current) {
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  // Scroll detail panel to top when question changes
  useEffect(() => {
    if (detailRef.current) {
      detailRef.current.scrollTop = 0;
    }
  }, [activeIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't intercept if user is in an input/textarea
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, questions.length - 1));
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    }
  }, [questions.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (questions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <p className="text-sm">No questions could be parsed from this assignment.</p>
          <p className="text-xs mt-1 opacity-70">Switch to Preview mode to see the raw content.</p>
        </div>
      </div>
    );
  }

  const active = questions[activeIndex];

  // Summary counts
  const typeCounts = questions.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="w-[260px] shrink-0 border-r border-border overflow-y-auto bg-sidebar/50"
      >
        {/* Summary header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
            Questions ({questions.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(typeCounts).map(([type, count]) => (
              <span
                key={type}
                className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', TYPE_COLORS[type])}
              >
                {count} {type}
              </span>
            ))}
          </div>
        </div>

        {/* Question list */}
        <div className="py-1">
          {questions.map((q, i) => (
            <button
              key={i}
              ref={el => { itemRefs.current[i] = el; }}
              onClick={() => setActiveIndex(i)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                i === activeIndex
                  ? 'bg-accent/10 border-l-2 border-accent'
                  : 'border-l-2 border-transparent hover:bg-sidebar'
              )}
            >
              <span className={cn(
                'text-sm font-semibold tabular-nums shrink-0 w-7',
                i === activeIndex ? 'text-accent' : 'text-text-secondary'
              )}>
                {q.number}
              </span>
              <span className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0',
                TYPE_COLORS[q.type]
              )}>
                {q.type}
              </span>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                q.difficulty === 'Easy' ? 'bg-green-500' :
                q.difficulty === 'Medium' ? 'bg-amber-500' : 'bg-red-500'
              )} title={q.difficulty} />
            </button>
          ))}
        </div>

        {/* Keyboard hint */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[10px] text-text-secondary flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-background border border-border text-[9px] font-mono">↑</kbd>
            <kbd className="px-1 py-0.5 rounded bg-background border border-border text-[9px] font-mono">↓</kbd>
            <span>to navigate</span>
          </p>
        </div>
      </div>

      {/* Detail panel */}
      <div ref={detailRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-6">
          {/* Question header */}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-semibold text-text-primary">
              Question {active.number}
            </h2>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded', TYPE_COLORS[active.type])}>
              {active.type}
            </span>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded', DIFFICULTY_COLORS[active.difficulty])}>
              {active.difficulty}
            </span>
            <span className="text-xs text-text-secondary ml-auto">
              {activeIndex + 1} / {questions.length}
            </span>
          </div>

          {/* Question body */}
          <div className="mb-6">
            <MarkdownPreview content={active.body} id={`question-${active.number}-body`} />
          </div>

          {/* Options (MCQ/MSQ) */}
          {active.options.length > 0 && (
            <div className="mb-6 space-y-2">
              {active.options.map((opt) => {
                const isCorrect = active.correctAnswer.includes(opt.label);
                return (
                  <div
                    key={opt.label}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors',
                      isCorrect
                        ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                        : 'border-border bg-background'
                    )}
                  >
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5',
                      isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-sidebar text-text-secondary border border-border'
                    )}>
                      {opt.label}
                    </span>
                    <span className={cn(
                      'text-sm leading-relaxed',
                      isCorrect ? 'text-text-primary font-medium' : 'text-text-primary'
                    )}>
                      {opt.text}
                    </span>
                    {isCorrect && (
                      <svg className="w-4 h-4 text-green-500 shrink-0 mt-1 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Correct answer summary */}
          {active.correctAnswer && (
            <div className="mb-6 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Correct Answer: {active.correctAnswer}
              </span>
            </div>
          )}

          {/* Explanation */}
          {active.explanation && (
            <div className="rounded-lg border border-border bg-sidebar/30 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-sidebar/50">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Explanation</span>
              </div>
              <div className="px-4 py-4">
                <MarkdownPreview content={active.explanation} id={`question-${active.number}-explanation`} />
              </div>
            </div>
          )}

          {/* Navigation buttons (mobile-friendly) */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <button
              onClick={() => setActiveIndex(prev => Math.max(prev - 1, 0))}
              disabled={activeIndex === 0}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors',
                activeIndex === 0
                  ? 'border-transparent text-text-secondary/30 cursor-not-allowed opacity-50'
                  : 'border-border text-text-primary hover:border-accent/40 hover:bg-sidebar/50'
              )}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </button>
            <button
              onClick={() => setActiveIndex(prev => Math.min(prev + 1, questions.length - 1))}
              disabled={activeIndex === questions.length - 1}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors',
                activeIndex === questions.length - 1
                  ? 'border-transparent text-text-secondary/30 cursor-not-allowed opacity-50'
                  : 'border-border text-text-primary hover:border-accent/40 hover:bg-sidebar/50'
              )}
            >
              Next
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
