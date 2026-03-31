'use client';

import { useState, useEffect, useRef } from 'react';
import { AIProvider } from '@/lib/types';
import { runInlineEdit, InlineEditAction } from '@/lib/ai/inlineEdit';
import { cn, getErrorMessage } from '@/lib/utils';

interface InlineAIPopoverProps {
  selectedText: string;
  position: { top: number; left: number };
  provider: AIProvider;
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

export function InlineAIPopover({
  selectedText,
  position,
  provider,
  onReplace,
  onClose,
}: InlineAIPopoverProps) {
  const [previewText, setPreviewText] = useState('');
  const [loadingAction, setLoadingAction] = useState<InlineEditAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const undoRef = useRef<string | null>(null);

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

  const handleAction = async (action: InlineEditAction) => {
    if (loadingAction) return;
    setLoadingAction(action);
    setPreviewText('');
    setError(null);

    try {
      await runInlineEdit(action, selectedText, provider, (chunk) => {
        if (chunk.delta) {
          setPreviewText((prev) => prev + chunk.delta);
        }
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReplace = () => {
    if (previewText.trim()) {
      undoRef.current = selectedText;
      setCanUndo(true);
      onReplace(previewText);
    }
  };

  const handleUndo = () => {
    if (undoRef.current !== null) {
      onReplace(undoRef.current);
      undoRef.current = null;
      setCanUndo(false);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="fixed bg-background border border-border rounded-lg shadow-lg"
      style={{ top: position.top, left: position.left, zIndex: 9999, width: '360px' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
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

      {/* Action buttons */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2.5">
        {ACTIONS.map(({ id, label }) => {
          const isLoading = loadingAction === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleAction(id)}
              disabled={loadingAction !== null}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border transition-colors',
                loadingAction !== null && !isLoading
                  ? 'bg-sidebar text-text-secondary cursor-not-allowed border-border'
                  : 'bg-background text-text-primary hover:bg-sidebar cursor-pointer'
              )}
            >
              {isLoading ? (
                <>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="animate-spin"
                  >
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
      </div>

      {/* Preview area */}
      {(previewText || error) && (
        <div className="px-3 pb-2.5">
          {error ? (
            <div className="px-2.5 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : (
            <textarea
              readOnly
              value={previewText}
              className="w-full min-h-20 max-h-48 p-2 text-xs leading-relaxed border border-border rounded-md bg-sidebar text-text-primary resize-y outline-none box-border"
            />
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
          disabled={!previewText.trim() || loadingAction !== null}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md border-none text-white transition-colors',
            !previewText.trim() || loadingAction !== null
              ? 'bg-accent/50 cursor-not-allowed'
              : 'bg-accent cursor-pointer hover:bg-accent/80'
          )}
        >
          Replace
        </button>
      </div>

      {/* Spinner keyframe injected once */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
