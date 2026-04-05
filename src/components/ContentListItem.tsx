'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, memo } from 'react';
import { ContentItem } from '@/lib/types';
import { Badge } from './ui/Badge';
import { cn, countWords, formatDate } from '@/lib/utils';
import { navigateWithTransition, vtName } from '@/lib/view-transitions';

interface ContentListItemProps {
  item: ContentItem;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRename?: (id: string, title: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  lecture: 'Lecture',
  'pre-lecture': 'Pre-Lecture',
  assignment: 'Assignment',
};

export const ContentListItem = memo(function ContentListItem({
  item,
  selected,
  onSelect,
  onDuplicate,
  onRename,
}: ContentListItemProps) {
  const router = useRouter();
  const date = formatDate(item.createdAt);
  const wordCount = countWords(item.markdown);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.title);

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
    if ((e.target as HTMLElement).closest('a')) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('form')) return;
    navigateWithTransition(() => router.push(`/content/${item.id}`));
  };

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        'group flex items-center gap-4 px-4 py-3 border-b border-border hover:bg-sidebar/50 dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer',
        selected && 'bg-accent/5 border-l-2 border-l-accent dark:bg-[rgba(255,255,255,0.06)]'
      )}
    >
      {/* Checkbox */}
      {onSelect && (
        <div
          className="flex shrink-0 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(item.id)}
            className="rounded border-border accent-accent w-4 h-4 cursor-pointer"
          />
        </div>
      )}

      {/* Title */}
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const trimmed = renameValue.trim();
              if (trimmed && onRename) {
                onRename(item.id, trimmed);
              }
              setIsRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1"
          >
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => {
                const trimmed = renameValue.trim();
                if (trimmed && onRename) {
                  onRename(item.id, trimmed);
                }
                setIsRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setRenameValue(item.title);
                  setIsRenaming(false);
                }
              }}
              className="text-sm font-semibold border-b border-accent bg-transparent outline-none w-full"
            />
          </form>
        ) : (
          <Link
            href={`/content/${item.id}`}
            className="font-semibold text-sm text-text-primary hover:text-accent truncate block"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              navigateWithTransition(() => router.push(`/content/${item.id}`));
            }}
            style={{ viewTransitionName: vtName('title', item.id) }}
          >
            {item.title || 'Untitled'}
          </Link>
        )}
      </div>

      {/* Type Badge */}
      <div className="shrink-0">
        <Badge variant={item.type as 'lecture' | 'pre-lecture' | 'assignment'} style={{ viewTransitionName: vtName('badge', item.id) }}>
          {TYPE_LABELS[item.type] ?? item.type}
        </Badge>
      </div>

      {/* Date */}
      <span className="shrink-0 text-xs text-text-secondary whitespace-nowrap">
        {date}
      </span>

      {/* Word count */}
      <span className="shrink-0 text-xs text-text-secondary whitespace-nowrap">
        ~{wordCount.toLocaleString()} words
      </span>

      {/* Source count */}
      {item.sources.length > 0 && (
        <span className="shrink-0 text-xs text-text-secondary whitespace-nowrap">
          {item.sources.length} file{item.sources.length !== 1 ? 's' : ''}
        </span>
      )}

      {/* Actions (visible on hover) */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onDuplicate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDuplicate(item.id);
            }}
            className="p-1 text-text-secondary hover:text-accent rounded transition-colors"
            title="Duplicate"
            aria-label="Duplicate content"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setRenameValue(item.title);
            setIsRenaming(true);
          }}
          className="p-1 text-text-secondary hover:text-accent rounded transition-colors"
          title="Rename"
          aria-label="Rename content"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.updatedAt === nextProps.item.updatedAt &&
    prevProps.selected === nextProps.selected
  );
});
