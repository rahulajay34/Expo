# Agent 18: Performance — Network Optimizations

## Suggestions Covered: S-029, S-030, S-031, S-032, S-033, S-034, S-035
## Category: Perf-Network
## Priority: P1
## Dependencies: agent-14 (font optimization — after fonts are self-hosted, preconnect for Google Fonts is unnecessary)
## Files to Read Before Starting: src/app/layout.tsx, src/lib/parsers/pdf.ts, next.config.js, src/components/Sidebar.tsx
## Files to Modify: src/app/layout.tsx, src/lib/parsers/pdf.ts, next.config.js

## Detailed Plan:

### S-029 + S-030: Preconnect + dns-prefetch
1. In layout.tsx `<head>`, add:
   ```html
   <link rel="preconnect" href="https://api.minimax.io" />
   <link rel="dns-prefetch" href="https://api.minimax.io" />
   ```
2. After S-014 (fonts self-hosted), Google Fonts preconnect is unnecessary — skip

### S-031: Vendor PDF.js worker
1. Copy `pdf.worker.min.mjs` from `node_modules/pdfjs-dist/build/` to `public/`
2. In `parsers/pdf.ts`, set worker URL to `/pdf.worker.min.mjs` instead of CDN URL
3. Add a build script or postinstall hook to keep this in sync (or just document it)

### S-032: Compression + cache headers
1. In `next.config.js`, add:
   ```js
   compress: true,
   async headers() {
     return [{
       source: '/_next/static/:path*',
       headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
     }];
   }
   ```

### S-033: Preload Plus Jakarta font weights
1. next/font/google already handles preloading — verify with DevTools
2. If preload hints are missing, add explicit `<link rel="preload">` tags

### S-034: fetchpriority="high" on hero
1. The home page hero is mostly text/SVG — no critical image to prioritize
2. Skip unless there's a specific LCP element identified

### S-035: Speculation Rules + router.prefetch
1. In layout.tsx, add:
   ```html
   <script type="speculationrules">
   { "prerender": [{ "where": { "href_matches": ["/content", "/settings"] } }] }
   </script>
   ```
2. In Sidebar, add `router.prefetch('/content')` etc. on mount

## Edge Cases to Handle:
- PDF worker file must be copied correctly and versioned
- Speculation Rules only work in Chromium — progressive enhancement, no fallback needed
- Cache headers already applied by Next.js for static assets — verify we're not duplicating

## Testing Plan: Build passes. DevTools Network tab shows local PDF worker, preconnect hints.
## Status: DONE

## Summary
- S-029+S-030: Added `<link rel="preconnect">` and `<link rel="dns-prefetch">` for `https://api.minimax.io` in layout.tsx `<head>`.
- S-031: Copied `pdf.worker.min.mjs` from `node_modules/pdfjs-dist/build/` to `public/`. Updated `parsers/pdf.ts` to use `/pdf.worker.min.mjs` (self-hosted) instead of CDN URL.
- S-032: Added `compress: true` and `async headers()` in `next.config.js` for `/_next/static/:path*` with `Cache-Control: public, max-age=31536000, immutable`.
- S-033: Verified — `next/font/google` handles font preloading automatically; no manual preload hints needed.
- S-034: Skipped — no critical LCP image identified on the home page.
- S-035: Added `<script type="speculationrules">` in layout.tsx for `/content` and `/settings`. Added `router.prefetch('/content')` and `router.prefetch('/settings')` in `Sidebar` on mount.
- `tsc --noEmit` passes (only pre-existing playwright missing-dependency errors unrelated to this work).
