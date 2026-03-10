'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { List, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

// ---------------------------------------------------------------------------
// Heading ID generation — slugify with duplicate handling
// ---------------------------------------------------------------------------

/**
 * Slugify a heading string: lowercase, replace spaces with dashes, remove
 * special characters. A `counts` map is used to disambiguate duplicate
 * headings by appending a numeric suffix.
 */
export function slugify(text: string, counts: Map<string, number>): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const slug = base || 'heading';
  const count = counts.get(slug) ?? 0;
  counts.set(slug, count + 1);
  return count === 0 ? slug : `${slug}-${count}`;
}

// ---------------------------------------------------------------------------
// Parse headings from raw markdown content
// ---------------------------------------------------------------------------

export function parseHeadings(markdown: string): TocItem[] {
  const headings: TocItem[] = [];
  const counts = new Map<string, number>();
  // Match lines that start with ## or ### (but not # or ####+)
  const regex = /^(#{2,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const level = match[1].length as 2 | 3;
    const rawText = match[2]
      // Strip inline markdown formatting
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .trim();

    headings.push({
      id: slugify(rawText, counts),
      text: rawText,
      level,
    });
  }

  return headings;
}

// ---------------------------------------------------------------------------
// TableOfContents component
// ---------------------------------------------------------------------------

interface TableOfContentsProps {
  /** Raw markdown string to extract headings from */
  markdown: string;
  /**
   * A ref to the scrollable container holding the rendered markdown.
   * Used for IntersectionObserver root and for scrolling to headings.
   */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

export function TableOfContents({
  markdown,
  scrollContainerRef,
}: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const headings = useMemo(() => parseHeadings(markdown), [markdown]);

  // -------------------------------------------------------------------------
  // Scroll spy via IntersectionObserver
  // -------------------------------------------------------------------------

  const setupObserver = useCallback(() => {
    // Tear down previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const container = scrollContainerRef.current;
    if (!container || headings.length === 0) return;

    // Find the actual viewport element inside Radix ScrollArea
    const viewport =
      container.querySelector('[data-slot="scroll-area-viewport"]') ??
      container;

    const headingEls = headings
      .map((h) => viewport.querySelector<HTMLElement>(`#${CSS.escape(h.id)}`))
      .filter(Boolean) as HTMLElement[];

    if (headingEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first currently-intersecting heading
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => {
            // Prefer the one nearest the top of the viewport
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root: viewport,
        // Trigger when the heading enters the top 30% of the viewport
        rootMargin: '0px 0px -70% 0px',
        threshold: 0,
      }
    );

    headingEls.forEach((el) => observer.observe(el));
    observerRef.current = observer;
  }, [headings, scrollContainerRef]);

  useEffect(() => {
    // Small delay to let headings render in the DOM
    const timer = setTimeout(setupObserver, 150);
    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [setupObserver]);

  // -------------------------------------------------------------------------
  // Click handler — smooth scroll to heading
  // -------------------------------------------------------------------------

  const scrollToHeading = useCallback(
    (id: string) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const viewport =
        container.querySelector('[data-slot="scroll-area-viewport"]') ??
        container;

      const el = viewport.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      if (!el) return;

      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    },
    [scrollContainerRef]
  );

  // Don't render anything if there are no headings
  if (headings.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-border/60 bg-muted/30">
      {/* Toggle button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <List className="size-3.5" />
          <span>Table of Contents</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
            {headings.length}
          </span>
        </span>
        {isOpen ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
      </Button>

      {/* TOC list */}
      {isOpen && (
        <nav
          aria-label="Table of contents"
          className="border-t border-border/40 px-2 py-2"
        >
          <ul className="space-y-0.5">
            {headings.map((heading) => (
              <li key={heading.id}>
                <button
                  onClick={() => scrollToHeading(heading.id)}
                  className={cn(
                    'w-full truncate rounded-md px-2 py-1 text-left text-xs transition-colors',
                    'hover:bg-muted hover:text-foreground',
                    heading.level === 3 && 'pl-5',
                    activeId === heading.id
                      ? 'border-l-2 border-primary bg-primary/5 font-medium text-primary'
                      : 'text-muted-foreground'
                  )}
                  title={heading.text}
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
