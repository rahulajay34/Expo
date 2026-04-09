# Agent 12: Performance — Lazy Imports + Package Optimization

## Suggestions Covered: S-001, S-002, S-003, S-018, S-020
## Category: Perf-Frontend
## Priority: P0
## Dependencies: agent-04 (MarkdownPreview split — MermaidChart is separate)
## Files to Read Before Starting: src/components/MarkdownPreview.tsx, src/components/MermaidChart.tsx, src/lib/parsers/pdf.ts, src/lib/parsers/file.ts, next.config.js, src/app/page.tsx
## Files to Modify: src/components/MermaidChart.tsx, src/lib/parsers/pdf.ts, next.config.js, src/app/page.tsx

## Detailed Plan:

### S-001: Lazy-load heavy deps
1. MermaidChart already lazy-imports mermaid — verify after split
2. highlight.js: rehype-highlight handles this internally — no action needed
3. katex: rehype-katex handles this internally — no action needed
4. pdfjs-dist: already uses `await import()` in pdf.ts — verify

### S-002: Defer pdfjs-dist
1. Verify `src/lib/parsers/pdf.ts` already uses `await import('pdfjs-dist')` inside `extractPDFText` — if so, mark as already done

### S-003: optimizePackageImports
1. In `next.config.js`, add:
   ```js
   experimental: {
     optimizePackageImports: ['framer-motion', 'react-markdown', 'rehype-highlight', 'highlight.js', 'mermaid']
   }
   ```

### S-018: Lazy-mount generation-only components
1. In `src/app/page.tsx`, wrap `TokenVelocityPulse`, `CountUp`, and `LiveContentMetrics` with `next/dynamic`:
   ```ts
   const TokenVelocityPulse = dynamic(() => import('@/components/TokenVelocityPulse'), { ssr: false });
   ```
2. Only render them when streaming is active

### S-020: Memoize mermaid module
1. In `MermaidChart.tsx`, ensure mermaid is loaded once at module scope (singleton promise pattern)
2. Should already be the case after split — verify

## Edge Cases to Handle:
- `next/dynamic` with ssr:false is correct for these browser-only components
- Verify optimizePackageImports doesn't break any imports

## Testing Plan: Build passes. Check bundle size with `npm run build` output.
## Status: NOT_STARTED
