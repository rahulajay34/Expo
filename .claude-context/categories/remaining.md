# Remaining Categories

## PWA & Offline (S-083..S-085)
- S-083: Service worker with precache — Medium complexity, new file
- S-084: Offline UI state — Low, layout.tsx + page.tsx
- S-085: Offline edits for cached content — Low, cache headers + service worker
**Dependencies:** All three are related; implement together.

## Mobile Optimization (S-086..S-092)
- S-086: Safe-area-inset padding — Low, layout.tsx, Sidebar.tsx, globals.css
- S-087: 100dvh instead of 100vh — Low, layout.tsx, globals.css
- S-088: touch-action: manipulation — Low, globals.css
- S-089: Responsive mermaid diagrams — Low, MarkdownPreview.tsx, globals.css
- S-090: Sidebar icon-rail on tablet — Medium, Sidebar.tsx, globals.css
- S-091: 44x44 touch targets — Low, globals.css
- S-092: Viewport-aware modals/popovers — Medium, Modal.tsx, InlineAIPopover, NotificationCentre, ExportMenu
**Dependencies:** None. Mostly CSS changes.

## Documentation (S-093, S-094)
- S-093: Document AI pipeline — Low, new docs/ai-pipeline.md
- S-094: Document prompt templates — Low, new docs/prompts.md
**Dependencies:** Best done after Code Quality refactoring.

## AI/ML (S-095)
- S-095: Stop generating button — Low, page.tsx, pipeline.ts, client.ts
**Dependencies:** Benefits from S-069 (timeouts) and S-076 (streaming state).

## Search & Discovery (S-096, S-097)
- S-096: Full-text search index — Medium, new search-index.ts, storage.ts, content/page.tsx
- S-097: Recent searches + autocomplete — Low, content/page.tsx, storage.ts
**Dependencies:** S-097 depends on S-096.

## Emerging (S-098..S-102)
- S-098: View Transitions API migration — Medium, view-transitions.ts, PageTransition, Sidebar
- S-099: File System Access API for export — Low, export/*.ts
- S-100: Speculation Rules (=S-035) — merged
- S-101: OPFS for large file storage — Medium, storage.ts, parsers/pdf.ts
- S-102: CSS Anchor Positioning — Low, InlineAIPopover, Select, NotificationCentre
**Dependencies:** All progressive enhancement. Feature-detect based.
