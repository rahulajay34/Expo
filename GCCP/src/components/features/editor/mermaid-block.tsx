'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Lazy mermaid loader — mermaid is ~1MB so we only import it when needed.
// The module-level promise ensures we only import & initialize once.
// ---------------------------------------------------------------------------

let mermaidPromise: Promise<typeof import('mermaid')['default']> | null = null;
let initTheme: string | null = null;

function getMermaid(theme: string): Promise<typeof import('mermaid')['default']> {
  if (!mermaidPromise || initTheme !== theme) {
    initTheme = theme;
    mermaidPromise = import('mermaid').then((m) => {
      const mermaid = m.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

// Monotonically increasing counter for unique diagram IDs
let diagramCounter = 0;

// ---------------------------------------------------------------------------
// MermaidBlock component
// ---------------------------------------------------------------------------

interface MermaidBlockProps {
  code: string;
}

export function MermaidBlock({ code }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const idRef = useRef<string>(`mermaid-diagram-${++diagramCounter}`);

  const renderDiagram = useCallback(async () => {
    const theme = resolvedTheme ?? 'light';
    try {
      const mermaid = await getMermaid(theme);
      const { svg } = await mermaid.render(idRef.current, code.trim());
      setSvgHtml(svg);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Invalid diagram syntax'
      );
      setSvgHtml(null);
      // Mermaid inserts a temp element on error — clean it up
      const tempEl = document.getElementById(idRef.current);
      tempEl?.remove();
    }
  }, [code, resolvedTheme]);

  useEffect(() => {
    // Re-generate the ID on each render cycle so mermaid doesn't complain
    // about duplicate IDs when the same block re-renders.
    idRef.current = `mermaid-diagram-${++diagramCounter}`;
    void renderDiagram();
  }, [renderDiagram]);

  if (error) {
    return (
      <div className="relative my-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 text-destructive" />
          <span className="text-[10px] font-medium text-destructive">
            Invalid diagram syntax
          </span>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="my-4 flex flex-col items-center rounded-lg border border-border/60 bg-muted/30 p-4">
      <div className="mb-2 self-end">
        <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
          Mermaid
        </span>
      </div>
      <div
        ref={containerRef}
        className="w-full max-w-full overflow-x-auto [&>svg]:mx-auto [&>svg]:max-w-full"
        dangerouslySetInnerHTML={svgHtml ? { __html: svgHtml } : undefined}
      />
      {!svgHtml && (
        <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
          Rendering diagram...
        </div>
      )}
    </div>
  );
}
