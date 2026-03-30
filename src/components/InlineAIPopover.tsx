'use client';

import { useState, useEffect, useRef } from 'react';
import { AIProvider } from '@/lib/types';
import { runInlineEdit, InlineEditAction } from '@/lib/ai/inlineEdit';

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
  const popoverRef = useRef<HTMLDivElement>(null);

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
      setError((err as Error).message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReplace = () => {
    if (previewText.trim()) {
      onReplace(previewText);
    }
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
        width: '360px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
          AI Edit
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9CA3AF',
            fontSize: '16px',
            lineHeight: 1,
            padding: '0 2px',
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          padding: '10px 12px',
          flexWrap: 'wrap',
        }}
      >
        {ACTIONS.map(({ id, label }) => {
          const isLoading = loadingAction === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleAction(id)}
              disabled={loadingAction !== null}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: loadingAction !== null && !isLoading ? '#F9FAFB' : '#FFFFFF',
                color: loadingAction !== null && !isLoading ? '#9CA3AF' : '#374151',
                cursor: loadingAction !== null ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s, border-color 0.15s',
              }}
            >
              {isLoading ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      border: '2px solid #6366F1',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
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
        <div style={{ padding: '0 12px 10px' }}>
          {error ? (
            <div
              style={{
                padding: '8px 10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#DC2626',
              }}
            >
              {error}
            </div>
          ) : (
            <textarea
              readOnly
              value={previewText}
              style={{
                width: '100%',
                minHeight: '80px',
                maxHeight: '200px',
                padding: '8px 10px',
                fontSize: '12px',
                fontFamily: 'inherit',
                lineHeight: '1.5',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                backgroundColor: '#F9FAFB',
                color: '#374151',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>
      )}

      {/* Footer buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          padding: '8px 12px',
          borderTop: '1px solid #E2E8F0',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            color: '#6B7280',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleReplace}
          disabled={!previewText.trim() || loadingAction !== null}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '6px',
            border: 'none',
            backgroundColor: !previewText.trim() || loadingAction !== null ? '#A5B4FC' : '#6366F1',
            color: '#FFFFFF',
            cursor: !previewText.trim() || loadingAction !== null ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
          }}
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
