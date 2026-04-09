# Category: Code Quality & Architecture

**Suggestions:** S-061 through S-068 (8 items)
**Dependencies:** None — this is foundational. Should execute FIRST.
**Overall complexity:** Medium-High

| ID | Summary | Files Affected | Complexity |
|----|---------|---------------|------------|
| S-061 | Split pipeline.ts into modules | ai/pipeline.ts -> ai/pipeline/*.ts | High |
| S-062 | Split content viewer (=S-004) | content/[id]/page.tsx -> sub-components | High |
| S-063 | Split MarkdownPreview into subs | MarkdownPreview.tsx -> sub-components | High |
| S-064 | Typed AppError hierarchy | NEW: errors.ts, + utils.ts, client.ts, parsers/pdf.ts, storage.ts | Medium |
| S-065 | Centralize magic numbers | NEW: config.ts, + storage.ts, stream-speed.ts, route.ts | Low |
| S-066 | Replace any/as any with types | parsers/pdf.ts, export/mermaid-wait.ts, client.ts | Medium |
| S-067 | Consolidate question-classification | export/csv.ts | Medium |
| S-068 | Extract rehypeWrapLines plugin | MarkdownPreview.tsx -> NEW: lib/rehype/wrap-lines.ts | Low |

**Execution order within category:**
1. S-064 (errors), S-065 (config) — new files, no conflicts
2. S-061 (split pipeline), S-068 (extract rehype plugin)
3. S-062 (split viewer), S-063 (split MarkdownPreview)
4. S-066 (type fixes), S-067 (CSV consolidation)
