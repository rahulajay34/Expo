'use client';

import Link from 'next/link';
import { useRef, useCallback } from 'react';
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
  const cardRef = useRef<HTMLDivElement>(null);
  const date = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const wordCount = item.markdown.trim().split(/\s+/).length;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rotateY = (x - 0.5) * 16; // ±8deg max
    const rotateX = (0.5 - y) * 16; // ±8deg max, inverted

    card.style.transform = `perspective(1000px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.02)`;
    card.style.setProperty('--shine-x', `${x * 100}%`);
    card.style.setProperty('--shine-y', `${y * 100}%`);

    // Adjust box-shadow based on tilt direction
    const shadowX = rotateY * 0.4;
    const shadowY = rotateX * 0.4;
    card.style.boxShadow = `${shadowX}px ${shadowY}px 16px rgba(99, 102, 241, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)`;
  }, []);

  const handleMouseDown = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `perspective(1000px) rotateY(${(parseFloat(card.style.transform.match(/rotateY\(([-\d.]+)deg\)/)?.[1] ?? '0'))}deg) rotateX(${(parseFloat(card.style.transform.match(/rotateX\(([-\d.]+)deg\)/)?.[1] ?? '0'))}deg) scale(0.98)`;
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleMouseMove(e);
  }, [handleMouseMove]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = '';
    card.style.boxShadow = '';
    card.style.setProperty('--shine-x', '50%');
    card.style.setProperty('--shine-y', '50%');
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={cn(
        'group card-3d card-shine bg-white border rounded-lg p-4 hover:border-accent/50',
        selected ? 'border-accent ring-1 ring-accent' : 'border-border'
      )}
    >
      <div className="flex items-start gap-2.5 relative z-10">
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
