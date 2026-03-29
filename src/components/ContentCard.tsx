'use client';

import Link from 'next/link';
import { ContentItem } from '@/lib/types';
import { Badge } from './ui/Badge';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  item: ContentItem;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  lecture: 'Lecture',
  'pre-lecture': 'Pre-Lecture',
  assignment: 'Assignment',
};

export function ContentCard({ item, selected, onSelect }: ContentCardProps) {
  const date = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const wordCount = item.markdown.trim().split(/\s+/).length;

  return (
    <div
      className={cn(
        'group bg-white border rounded-lg p-4 hover:border-accent/50 hover:shadow-sm transition-all duration-150',
        selected ? 'border-accent ring-1 ring-accent' : 'border-border'
      )}
    >
      <div className="flex items-start gap-2.5">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(item.id)}
            className="mt-0.5 rounded border-border accent-accent shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <Link
              href={`/content/${item.id}`}
              className="font-medium text-sm text-text-primary hover:text-accent line-clamp-2 leading-snug flex-1"
            >
              {item.title || 'Untitled'}
            </Link>
            <Badge variant={item.type as 'lecture' | 'pre-lecture' | 'assignment'}>
              {TYPE_LABELS[item.type] ?? item.type}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
            <span>{date}</span>
            <span>·</span>
            <span className="uppercase font-medium">{item.provider}</span>
            <span>·</span>
            <span>~{wordCount.toLocaleString()} words</span>
            {item.sources.length > 0 && (
              <>
                <span>·</span>
                <span>{item.sources.length} file{item.sources.length !== 1 ? 's' : ''}</span>
              </>
            )}
          </div>

          {item.metadata.topic && (
            <p className="mt-1.5 text-xs text-text-secondary truncate">
              <span className="text-text-secondary/70">Topic:</span> {item.metadata.topic}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
