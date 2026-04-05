'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AIProvider } from '@/lib/types';
import { runInlineEdit, InlineEditAction, InlineEditContext } from '@/lib/ai/inlineEdit';
import { cn, getErrorMessage } from '@/lib/utils';

interface InlineAIPopoverProps {
  selectedText: string;
  position: { top: number; left: number };
  provider: AIProvider;
  contentType?: string;
  topic?: string;
  documentOutline?: string;
  sectionBefore?: string;
  sectionAfter?: string;
  onReplace: (newText: string) => void;
  onClose: () => void;
}

interface ActionConfig {
  id: InlineEditAction;
  label: string;
}

const ACTIONS: ActionConfig[] = [
  { id: 'improve',  label: '✨ Improve'  },
  { id: 'expand',   label: '📖 Expand'   },
  { id: 'simplify', label: '⚡ Simplify' },
  { id: 'examples', label: '💡 Examples' },
];

const ACTION_INSTRUCTIONS_LABELS: Record<string, string> = {
  improve: 'Improve: make clearer and better structured',
  expand: 'Expand: add more detail and depth',
  simplify: 'Simplify: make easier to understand',
  examples: 'Add examples',
};

function AnimatedDots() {
  return (
    <span className="inline-flex items-center gap-[2px]">
      <span className="inline-block w-1 h-1 rounded-full bg-accent animate-[dotPulse_1.4s_ease-in-out_0s_infinite]" />
      <span className="inline-block w-1 h-1 rounded-full bg-accent animate-[dotPulse_1.4s_ease-in-out_0.2s_infinite]" />
      <span className="inline-block w-1 h-1 rounded-full bg-accent animate-[dotPulse_1.4s_ease-in-out_0.4s_infinite]" />
    </span>
  );
}

export function InlineAIPopover({
  selectedText,
  position,
  provider,
  contentType,
  topic,
  documentOutline,
  sectionBefore,
  sectionAfter,
  onReplace,
  onClose,
}: InlineAIPopoverProps) {
  const [previewText, setPreviewText] = useState('');
  const [loadingAction, setLoadingAction] = useState<InlineEditAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [userInstruction, setUserInstruction] = useState('');
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const popoverRef = useRef<HTMLDivElement>(null);
  const undoRef = useRef<string | null>(null);
  const instructionRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origTop: number; origLeft: number } | null>(null);
  const [editHistory, setEditHistory] = useState<{ instruction: string; result: string }[]>([]);
  const SHORT_SELECTION_THRESHOLD = 100;
  const isShortSelection = selectedText.length <= SHORT_SELECTION_THRESHOLD;
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [selectedAltIndex, setSelectedAltIndex] = useState(0);
  const [lastAction, setLastAction] = useState<InlineEditAction | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Viewport boundary detection — reposition if popover overflows (only on initial mount)
  const hasPositionedRef = useRef(false);
  useEffect(() => {
    if (hasPositionedRef.current) return;
    const el = popoverRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const padding = 16;
    let { top, left } = position;

    if (rect.right > window.innerWidth) {
      left = window.innerWidth - rect.width - padding;
    }
    if (left < padding) {
      left = padding;
    }
    if (rect.bottom > window.innerHeight) {
      top = position.top - rect.height - padding;
    }
    if (top < padding) {
      top = padding;
    }

    if (top !== position.top || left !== position.left) {
      setAdjustedPosition({ top, left });
    }
    hasPositionedRef.current = true;
  }, [position]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Only drag from left mouse button, ignore clicks on the close button
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origTop: adjustedPosition.top,
      origLeft: adjustedPosition.left,
    };
  }, [adjustedPosition]);

  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setAdjustedPosition({
        top: dragRef.current.origTop + dy,
        left: dragRef.current.origLeft + dx,
      });
    };
    const handleDragEnd = () => {
      dragRef.current = null;
    };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Auto-resize instruction textarea
  const handleInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInstruction(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    const maxHeight = 72; // ~3 rows
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };

  const handleAction = async (action: InlineEditAction, overrideInstruction?: string) => {
    if (loadingAction) return;
    const instruction = overrideInstruction ?? userInstruction.trim();
    if (action === 'custom' && !instruction) return;
    setLoadingAction(action);
    setLastAction(action);
    setPreviewText('');
    setError(null);
    setAlternatives([]);

    const instructionLabel = action === 'custom'
      ? instruction
      : ACTION_INSTRUCTIONS_LABELS[action] ?? action;

    const context: InlineEditContext = {
      contentType,
      topic,
      documentOutline,
      sectionBefore,
      sectionAfter,
      userInstruction: instruction || undefined,
      editHistory: editHistory.length > 0 ? editHistory : undefined,
    };

    let fullResult = '';
    try {
      if (isShortSelection) {
        // Multi-alternative mode
        const { runInlineEditMulti, parseAlternatives } = await import('@/lib/ai/inlineEdit');
        await runInlineEditMulti(action, selectedText, provider, (chunk) => {
          if (chunk.delta) {
            fullResult += chunk.delta;
            setPreviewText((prev) => prev + chunk.delta);
          }
        }, context, 3);

        const alts = parseAlternatives(fullResult);
        setAlternatives(alts);
        setSelectedAltIndex(0);
      } else {
        // Single result mode (existing behavior)
        await runInlineEdit(action, selectedText, provider, (chunk) => {
          if (chunk.delta) {
            fullResult += chunk.delta;
            setPreviewText((prev) => prev + chunk.delta);
          }
        }, context);
      }
      // Track in history
      if (fullResult.trim()) {
        setEditHistory(prev => [...prev, { instruction: instructionLabel, result: fullResult }]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReplace = () => {
    const textToReplace = isShortSelection && alternatives.length > 1
      ? alternatives[selectedAltIndex]
      : previewText;
    if (textToReplace?.trim()) {
      undoRef.current = selectedText;
      setCanUndo(true);
      onReplace(textToReplace);
    }
  };

  const handleUndo = () => {
    if (undoRef.current !== null) {
      onReplace(undoRef.current);
      undoRef.current = null;
      setCanUndo(false);
    }
  };

  const handleSuggest = async () => {
    if (loadingSuggestions || loadingAction) return;
    setLoadingSuggestions(true);
    setSuggestedActions([]);

    const context: InlineEditContext = {
      contentType,
      topic,
      documentOutline,
      sectionBefore,
      sectionAfter,
    };

    let fullResult = '';
    try {
      const { generateSuggestedActions, parseSuggestedActions } = await import('@/lib/ai/inlineEdit');
      await generateSuggestedActions(selectedText, provider, (chunk) => {
        if (chunk.delta) fullResult += chunk.delta;
      }, context);
      const actions = parseSuggestedActions(fullResult);
      setSuggestedActions(actions);
    } catch {
      // Silently fail — suggestions are optional
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSuggestedAction = (suggestion: string) => {
    setUserInstruction(suggestion);
    handleAction('custom', suggestion);
  };

  const isStreaming = loadingAction !== null;

  return (
    <div
      ref={popoverRef}
      className="fixed glass-panel rounded-lg"
      style={{ top: adjustedPosition.top, left: adjustedPosition.left, zIndex: 9999, width: 'min(400px, calc(100vw - 32px))' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header — drag handle */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleDragStart}
      >
        <span className="text-xs font-semibold text-text-primary">
          AI Edit
        </span>
        <button
          type="button"
          onClick={onClose}
          className="bg-none border-none cursor-pointer text-text-secondary hover:text-text-primary text-xl leading-none px-0.5"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* User instruction input */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="flex gap-1.5 items-end">
          <textarea
            ref={instructionRef}
            value={userInstruction}
            onChange={handleInstructionChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && userInstruction.trim() && !loadingAction) {
                e.preventDefault();
                handleAction('custom');
              }
            }}
            placeholder="Describe what you want..."
            rows={1}
            className="flex-1 px-2.5 py-1.5 text-xs leading-relaxed border border-border rounded-md bg-background text-text-primary resize-none focus:outline-none focus:border-accent/60 placeholder:text-text-secondary/50 box-border transition-colors"
            style={{ minHeight: '28px', maxHeight: '72px' }}
          />
          <button
            type="button"
            onClick={() => handleAction('custom')}
            disabled={!userInstruction.trim() || loadingAction !== null}
            className={cn(
              'shrink-0 p-1.5 rounded-md transition-colors',
              userInstruction.trim() && !loadingAction
                ? 'bg-accent text-white hover:bg-accent/80 cursor-pointer'
                : 'bg-sidebar text-text-secondary/40 cursor-not-allowed'
            )}
            title="Submit custom instruction (Enter)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {editHistory.length > 0 && (
        <div className="px-3 pb-1">
          <span className="text-[10px] text-text-secondary/60">
            {editHistory.length} edit{editHistory.length !== 1 ? 's' : ''} in this session — AI remembers context
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2">
        {ACTIONS.map(({ id, label }) => {
          const isLoading = loadingAction === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleAction(id)}
              disabled={loadingAction !== null || loadingSuggestions}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border transition-colors',
                loadingAction !== null && !isLoading
                  ? 'bg-sidebar text-text-secondary cursor-not-allowed border-border'
                  : 'bg-background text-text-primary hover:bg-sidebar cursor-pointer'
              )}
            >
              {isLoading ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  {label}
                </>
              ) : (
                label
              )}
            </button>
          );
        })}

        {/* Suggest button */}
        <button
          type="button"
          onClick={handleSuggest}
          disabled={loadingAction !== null || loadingSuggestions}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors',
            loadingSuggestions
              ? 'border-accent/40 bg-accent/5 text-accent cursor-wait'
              : 'border-dashed border-border text-text-secondary hover:text-accent hover:border-accent/40 cursor-pointer'
          )}
        >
          {loadingSuggestions ? (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Thinking...
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              Suggest
            </>
          )}
        </button>
      </div>

      {/* Suggested actions (shown after clicking Suggest) */}
      {suggestedActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {suggestedActions.map((suggestion, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSuggestedAction(suggestion)}
              disabled={loadingAction !== null}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 cursor-pointer transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator bar */}
      {isStreaming && (
        <div className="px-3 pb-1">
          <div className="w-full h-[2px] bg-border dark:bg-[rgba(255,255,255,0.12)] rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full animate-[progressSlide_1.5s_ease-in-out_infinite]" />
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-xs text-text-secondary">Generating</span>
            <AnimatedDots />
          </div>
        </div>
      )}

      {/* Preview area */}
      {(previewText || error) && (
        <div className="px-3 pb-2.5 pt-1">
          {error ? (
            <div className="px-2.5 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : isShortSelection && alternatives.length > 1 && !isStreaming ? (
            /* Multi-alternative radio selection for short text */
            <div className="space-y-1.5">
              {alternatives.map((alt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedAltIndex(i)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs rounded-md border transition-colors',
                    i === selectedAltIndex
                      ? 'border-accent bg-accent/10 text-text-primary'
                      : 'border-border bg-background text-text-secondary hover:bg-sidebar'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                      i === selectedAltIndex ? 'border-accent' : 'border-border'
                    )}>
                      {i === selectedAltIndex && (
                        <span className="w-2 h-2 rounded-full bg-accent" />
                      )}
                    </span>
                    <span className="leading-relaxed">{alt}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Single result textarea (long text or streaming) */
            <div>
              <textarea
                readOnly
                value={previewText}
                className={cn(
                  'w-full min-h-28 max-h-56 p-2.5 text-xs leading-relaxed border border-border rounded-md bg-sidebar text-text-primary resize-y outline-none box-border transition-opacity',
                  isStreaming && 'animate-[shimmer_2s_ease-in-out_infinite]'
                )}
              />
              {!isStreaming && !isShortSelection && previewText && (
                <button
                  type="button"
                  onClick={() => handleAction(lastAction ?? 'improve')}
                  className="mt-1.5 text-[10px] text-accent hover:text-accent/80 font-medium"
                >
                  Regenerate
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer buttons */}
      <div className="flex justify-end gap-2 px-3 py-2 border-t border-border">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background text-text-secondary cursor-pointer"
        >
          Cancel
        </button>
        {canUndo && (
          <button
            type="button"
            onClick={handleUndo}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
          >
            Undo
          </button>
        )}
        <button
          type="button"
          onClick={handleReplace}
          disabled={(!previewText.trim() && alternatives.length === 0) || loadingAction !== null}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md border-none text-white transition-colors',
            (!previewText.trim() && alternatives.length === 0) || loadingAction !== null
              ? 'bg-accent/50 cursor-not-allowed'
              : 'bg-accent cursor-pointer hover:bg-accent/80'
          )}
        >
          Replace
        </button>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes progressSlide {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
