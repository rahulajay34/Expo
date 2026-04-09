# Category: Performance — Frontend

**Suggestions:** S-001 through S-028 (28 items)
**Dependencies:** Depends on Code Quality (S-061..S-068) completing first — split modules are easier to optimize.
**Overall complexity:** Mixed (low to high)

## Suggestions

| ID | Summary | Files Affected | Complexity | Order |
|----|---------|---------------|------------|-------|
| S-001 | Lazy-load mermaid/pdfjs/hljs/katex | MarkdownPreview, parsers/pdf, export/pdf, page.tsx | Medium | 1 |
| S-002 | Defer pdfjs-dist until upload | parsers/pdf.ts, parsers/file.ts | Low | 1 |
| S-003 | optimizePackageImports in next.config | next.config.js | Low | 1 |
| S-004 | Code-split content viewer (=S-062) | content/[id]/page.tsx | High | After S-062 |
| S-005 | Virtualize content library grid | content/page.tsx, ContentCard, ContentListItem | Medium | 2 |
| S-006 | Cache rehype/remark plugins | MarkdownPreview.tsx | Low | 1 |
| S-007 | Memoize ContentCard/ContentListItem | ContentCard.tsx, ContentListItem.tsx | Low | 1 |
| S-008 | Debounce editor preview render | MarkdownEditor.tsx | Low | 1 |
| S-009 | Defer theme-init script | layout.tsx | Medium | 2 |
| S-010 | JetBrains Mono via next/font | globals.css, layout.tsx | Low | 1 |
| S-011 | Stop preloading all fonts | theme-context.tsx, settings/page.tsx | Medium | 1 |
| S-012 | All fonts via next/font (=S-036) | layout.tsx, theme-context.tsx | High | 1 |
| S-013 | font-display: optional for secondary | theme-context.tsx, layout.tsx | Low | After S-012 |
| S-014 | content-visibility: auto | ContentCard, MarkdownPreview, PipelineTimeline | Low | 2 |
| S-015 | Gate PhysicsScroll on device | PhysicsScroll.tsx, page.tsx, content/[id]/page.tsx | Medium | 2 |
| S-016 | Solid surface for dropdowns | globals.css | Low | 1 |
| S-017 | Toggle will-change on animation | motion.ts, PhysicsScroll.tsx | Medium | 2 |
| S-018 | Lazy-mount generation-only components | page.tsx | Low | 1 |
| S-019 | Conditionally drop rehype plugins | MarkdownPreview.tsx | Medium | After S-006 |
| S-020 | Memoize mermaid module | MarkdownPreview.tsx | Low | 1 |
| S-021 | SVG sprite for illustrations | GenerationForm.tsx | Medium | 3 |
| S-022 | Decouple AmbientLines from type switch | AmbientLines.tsx | Low | 2 |
| S-023 | Prefetch /content/[id] on hover | ContentCard, ContentListItem, content/page.tsx | Low | 2 |
| S-024 | Batch localStorage reads | generation-context.tsx, storage.ts, content/page.tsx | Medium | 2 |
| S-025 | Web Worker for section parsing | pipeline.ts | High | 3 |
| S-026 | scheduler.postTask in SSE reader | client.ts, stream-speed.ts | Medium | 3 |
| S-027 | Bundle analyzer + size budget | next.config.js, package.json | Low | 1 |
| S-028 | Remove idle @keyframes animations | globals.css, tailwind.config.ts | Low | 1 |
