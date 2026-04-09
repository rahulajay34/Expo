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
## Status: NOT_STARTED
