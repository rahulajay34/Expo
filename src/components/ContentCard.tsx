'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const innerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const date = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const wordCount = item.markdown.trim().split(/\s+/).length;

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on checkbox or inner links
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
    if ((e.target as HTMLElement).closest('a')) return;
    router.push(`/content/${item.id}`);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const inner = innerRef.current;
    if (!inner) return;
    if (!window.matchMedia('(hover: hover)').matches) return;
    
    // Measure on the OUTER element (currentTarget) which is NOT transformed!
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rotateY = (x - 0.5) * 16; // ±8deg max
    const rotateX = (0.5 - y) * 16; // ±8deg max, inverted

    inner.style.transform = `perspective(1000px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.02)`;
    inner.style.setProperty('--shine-x', `${x * 100}%`);
    inner.style.setProperty('--shine-y', `${y * 100}%`);

    const shadowX = rotateY * 0.4;
    const shadowY = rotateX * 0.4;
    inner.style.boxShadow = `${shadowX}px ${shadowY}px 16px rgba(99, 102, 241, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)`;
  }, []);

  const handleMouseDown = useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return;
    inner.style.transform = `perspective(1000px) rotateY(${(parseFloat(inner.style.transform.match(/rotateY\(([-\d.]+)deg\)/)?.[1] ?? '0'))}deg) rotateX(${(parseFloat(inner.style.transform.match(/rotateX\(([-\d.]+)deg\)/)?.[1] ?? '0'))}deg) scale(0.98)`;
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleMouseMove(e);
  }, [handleMouseMove]);

  const handleMouseLeave = useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return;
    // Add smooth transition for resetting
    inner.style.transition = 'transform 0.4s ease, box-shadow 0.4s ease';
    inner.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
    inner.style.boxShadow = '';
    inner.style.setProperty('--shine-x', '50%');
    inner.style.setProperty('--shine-y', '50%');
    
    // Remove transition after it's done so it doesn't lag mouse moves
    setTimeout(() => {
      if (inner) inner.style.transition = '';
    }, 400);
  }, []);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleCardClick}
      className="cursor-pointer h-full"
      style={{ perspective: '1000px' }}
    >
      <div
        ref={innerRef}
        className={cn(
          'group card-3d card-shine bg-white border rounded-lg p-4 hover:border-accent/50 h-full flex flex-col',
          selected ? 'border-accent ring-1 ring-accent' : 'border-border'
        )}
      >
        <div className="flex items-start gap-2.5 relative z-10">
          {onSelect && (
            <div
              className="flex shrink-0 p-2 -m-2 cursor-default"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onSelect(item.id)}
                className="mt-0.5 rounded border-border accent-accent w-4 h-4 cursor-pointer"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Link
                href={`/content/${item.id}`}
                className="font-medium text-sm text-text-primary hover:text-accent line-clamp-2 leading-snug flex-1"
                onClick={(e) => e.stopPropagation()}
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
    </div>
  );
}
