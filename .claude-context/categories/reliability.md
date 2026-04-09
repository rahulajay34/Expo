# Category: Reliability & Resilience

**Suggestions:** S-069 through S-076 (8 items)
**Dependencies:** S-069 benefits from S-064 (typed errors). S-073 touches api/minimax (same as S-037).
**Overall complexity:** Medium

| ID | Summary | Files Affected | Complexity |
|----|---------|---------------|------------|
| S-069 | Explicit streaming timeout | ai/client.ts | Low |
| S-070 | Exponential backoff with jitter | ai/client.ts | Low |
| S-071 | Graceful partial PDF parse | parsers/pdf.ts | Medium |
| S-072 | Mermaid fallback to raw code | export/mermaid-wait.ts, MarkdownPreview.tsx | Low |
| S-073 | Circuit-breaker for upstream 429/5xx | api/minimax/route.ts | Medium |
| S-074 | Storage-full error with action | StorageWarningBanner.tsx, storage.ts, settings/page.tsx | Medium |
| S-075 | Chunk large PDFs by page | parsers/pdf.ts | Medium |
| S-076 | Warn on unclosed streaming | page.tsx, generation-context.tsx | Low |
