# Agent 24: Search — Full-text Index + Recent Searches

## Suggestions Covered: S-096, S-097
## Category: Search
## Priority: P2
## Dependencies: none
## Files to Read Before Starting: src/lib/storage.ts, src/app/content/page.tsx
## Files to Modify: src/app/content/page.tsx, src/lib/storage.ts
## Files to Create: src/lib/search-index.ts

## Detailed Plan:

### S-096: Full-text search index
1. Create `src/lib/search-index.ts`:
   - Build a simple inverted index: word → Set<contentId>
   - `buildIndex(items: ContentItem[]): SearchIndex`
   - `search(index: SearchIndex, query: string): string[]` — returns matching IDs, ranked by hit count
   - Index fields: title, topic (from metadata), first 500 chars of markdown
   - Tokenize: lowercase, split on whitespace/punctuation, filter stopwords
2. In content/page.tsx:
   - Build index once on mount from `getAllContent()`
   - Use index for search instead of the current simple `.includes()` filter
   - Rebuild index when items change (subscribe to storage events)

### S-097: Recent searches
1. Store last 10 search queries in localStorage key `news13n_recent_searches`
2. On search submit (debounce completed), push query to the list
3. Show recent searches as clickable chips below the search input when it's focused and empty
4. "Clear recent" link to reset

## Edge Cases to Handle:
- Index must be rebuilt when items are added/deleted
- Empty search should show all items (don't filter via index)
- Recent searches should deduplicate

## Testing Plan: Build passes. Search with multiple terms. Verify recent searches persist.
## Status: DONE

## Summary
- Created `src/lib/search-index.ts` with `buildIndex(items)` (inverted Map index over title + topic + first 500 chars of markdown) and `search(index, query)` returning IDs ranked by hit count (exact matches weight 2, prefix matches weight 1; tokenizer strips stopwords).
- Updated `src/app/content/page.tsx`:
  - Removed `searchContent` import (old simple `.includes()` path). Added `buildIndex`/`search` from search-index and `subscribeToStorageChanges` from storage.
  - Index is built on mount via `refreshItems` callback and rebuilt on any storage change event (same-tab and cross-tab).
  - `filtered` useMemo now uses the inverted index when a query is present; preserves relevance rank order; falls back to all items when query is empty.
  - Added `recentSearches` state (localStorage key `news13n_recent_searches`, max 10, deduplicated). Saved on debounce settle when query is non-empty.
  - Recent searches dropdown shown when input is focused and empty; chips are clickable to re-apply query; "Clear recent" button clears and resets state.
- `tsc --noEmit` passes (only pre-existing e2e/playwright errors unrelated to this work).
