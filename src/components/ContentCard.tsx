'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { ContentItem } from '@/lib/types';
import { Badge } from './ui/Badge';
import { cn, countWords, formatDate } from '@/lib/utils';
import { navigateWithTransition, vtName } from '@/lib/view-transitions';

interface ContentCardProps {
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

const PROVIDER_LABEL = 'AI Generated';

/** Light/dark glow colors for the radial cursor glow overlay */
const GLOW_LIGHT = 'rgba(35, 131, 226, 0.06)';
const GLOW_DARK = 'rgba(107, 163, 232, 0.08)';

export const ContentCard = memo(function ContentCard({ item, selected, onSelect, onDuplicate, onRename }: ContentCardProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const isTouchDevice = useRef(false);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  const router = useRouter();
  const date = formatDate(item.createdAt);
  const wordCount = countWords(item.markdown);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.title);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
    if ((e.target as HTMLElement).closest('a')) return;
    navigateWithTransition(() => router.push(`/content/${item.id}`));
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const inner = innerRef.current;
    const glow = glowRef.current;
    if (!inner) return;
    if (isTouchDevice.current || prefersReducedMotion.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const pxX = e.clientX - rect.left;
    const pxY = e.clientY - rect.top;

    const rotateY = (x - 0.5) * 16;
    const rotateX = (0.5 - y) * 16;

    inner.style.transform = `perspective(1000px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.02)`;

    // Update radial glow position
    if (glow) {
      const isDark = document.documentElement.classList.contains('dark');
      const glowColor = isDark ? GLOW_DARK : GLOW_LIGHT;
      glow.style.background = `radial-gradient(250px circle at ${pxX}px ${pxY}px, ${glowColor}, transparent 60%)`;
      glow.style.opacity = '1';
    }

    const shadowX = rotateY * 0.4;
    const shadowY = rotateX * 0.4;
    inner.style.boxShadow = `${shadowX}px ${shadowY}px 16px rgba(35, 131, 226, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)`;
  }, []);

  const handleMouseDown = useCallback(() => {
    if (!window.matchMedia('(hover: hover)').matches || prefersReducedMotion.current) return;
    const inner = innerRef.current;
    if (!inner) return;
    inner.style.transform = `perspective(1000px) rotateY(${(parseFloat(inner.style.transform.match(/rotateY\(([-\d.]+)deg\)/)?.[1] ?? '0'))}deg) rotateX(${(parseFloat(inner.style.transform.match(/rotateX\(([-\d.]+)deg\)/)?.[1] ?? '0'))}deg) scale(0.98)`;
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!window.matchMedia('(hover: hover)').matches || prefersReducedMotion.current) return;
    handleMouseMove(e);
  }, [handleMouseMove]);

  const handleMouseLeave = useCallback(() => {
    const inner = innerRef.current;
    const glow = glowRef.current;
    if (!inner) return;
    inner.style.transition = 'transform 0.4s ease, box-shadow 0.4s ease';
    inner.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
    inner.style.boxShadow = '';

    // Fade out the glow overlay
    if (glow) {
      glow.style.opacity = '0';
    }

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
          'group card-3d relative overflow-hidden bg-background dark:bg-card-bg border rounded-lg p-4 hover:border-accent/50 h-full flex flex-col',
          selected ? 'border-accent ring-1 ring-accent' : 'border-border'
        )}
        style={{ viewTransitionName: vtName('card', item.id) }}
      >
        {/* Radial cursor glow overlay */}
        <div
          ref={glowRef}
          className="absolute inset-0 rounded-[inherit] pointer-events-none z-[1] transition-opacity duration-200 motion-reduce:transition-none"
          style={{ opacity: 0 }}
          aria-hidden="true"
        />
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
                    className="text-sm font-medium border-b border-accent bg-transparent outline-none w-full"
                  />
                </form>
              ) : (
                <Link
                  href={`/content/${item.id}`}
                  className="font-medium text-sm text-text-primary hover:text-accent line-clamp-2 leading-snug flex-1"
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
              <div className="flex items-center gap-1 shrink-0">
                {onDuplicate && (
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDuplicate(item.id); }}
                    className="p-1 text-text-secondary hover:text-accent hover:scale-110 active:scale-95 rounded transition-all duration-150"
                    title="Duplicate"
                    aria-label="Duplicate content"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  className="p-1 text-text-secondary hover:text-accent hover:scale-110 active:scale-95 rounded transition-all duration-150"
                  title="Rename"
                  aria-label="Rename content"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <Badge variant={item.type as 'lecture' | 'pre-lecture' | 'assignment'} style={{ viewTransitionName: vtName('badge', item.id) }}>
                  {TYPE_LABELS[item.type] ?? item.type}
                </Badge>
                <Badge variant="provider">
                  {PROVIDER_LABEL}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
              <span>{date}</span>
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
}, (prevProps, nextProps) => {
  return prevProps.item.id === nextProps.item.id && prevProps.item.updatedAt === nextProps.item.updatedAt && prevProps.selected === nextProps.selected;
});
