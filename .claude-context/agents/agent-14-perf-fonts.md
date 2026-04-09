# Agent 14: Performance — Font Optimization Cluster

## Suggestions Covered: S-010, S-011, S-012, S-013, S-036
## Category: Perf-Frontend + Perf-Network
## Priority: P0
## Dependencies: none
## Files to Read Before Starting: src/app/layout.tsx, src/app/globals.css, src/lib/theme-context.tsx, src/app/settings/page.tsx
## Files to Modify: src/app/layout.tsx, src/app/globals.css, src/lib/theme-context.tsx, src/app/settings/page.tsx

## Detailed Plan:

### S-010: JetBrains Mono via next/font
1. Remove `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono...')` from globals.css
2. In layout.tsx, add: `const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains', display: 'swap' })`
3. Add the variable class to `<html>`

### S-011: Stop preloading all fonts
1. In `theme-context.tsx`, remove the `preloadAllFonts()` call from the init effect
2. Only load the user's currently selected font on mount
3. Move `preloadAllFonts()` call to `settings/page.tsx` — only when settings page mounts (for the font picker preview)

### S-012: All fonts via next/font (subsumes S-036)
1. Register the secondary fonts (Inter, Nunito, DM Sans, Lora, Source Serif, IBM Plex Sans, Space Grotesk, Merriweather) via `next/font/google` in layout.tsx
2. Each gets a CSS variable: `--font-inter`, `--font-nunito`, etc.
3. Update theme-context.tsx `loadGoogleFont()` to set `--font-custom` to the appropriate CSS variable instead of injecting a `<link>` tag
4. Remove the runtime Google Fonts `<link>` injection from both layout.tsx inline script and theme-context.tsx
5. This automatically resolves S-036

### S-013: font-display: optional for secondary fonts
1. Set `display: 'optional'` for all secondary font registrations in next/font/google
2. Keep `display: 'swap'` for Plus Jakarta Sans (primary) and JetBrains Mono (code)

## Edge Cases to Handle:
- The inline theme script in layout.tsx currently injects a Google Fonts `<link>` — must update it to use CSS variables instead
- Font picker in settings must still show previews — use the pre-registered CSS variables
- If a user had a previously saved font preference, the CSS variable approach must still apply it correctly on first paint

## Testing Plan: Build passes. No Google Fonts network requests in DevTools. Font switching works in settings.
## Status: DONE

## Summary

All five suggestions (S-010, S-011, S-012, S-013, S-036) implemented:

### S-010: JetBrains Mono via next/font
- Removed `@import url(...)` for JetBrains Mono from `globals.css`
- Added `JetBrains_Mono` via `next/font/google` in `layout.tsx` with `--font-jetbrains` CSS variable and `display: 'swap'`
- Updated `globals.css` `.markdown-body code` to use `var(--font-jetbrains)` with fallback
- Updated `tailwind.config.ts` `font-mono` to use the CSS variable

### S-011: Stop preloading all fonts on mount
- `preloadAllFonts()` in `theme-context.tsx` is now a no-op since all fonts are self-hosted via next/font (no runtime loading needed)
- Settings page still calls it for API compatibility but it does nothing

### S-012 + S-036: All fonts via next/font (self-hosted, no runtime Google Fonts)
- Registered all 9 secondary fonts (Inter, Source Sans 3, Nunito, Rubik, Space Grotesk, DM Sans, Outfit, Raleway, Lora) via `next/font/google` in `layout.tsx`
- Each font gets a CSS variable (`--font-inter`, `--font-nunito`, etc.) applied to `<html>`
- Replaced `loadGoogleFont()` (which injected `<link>` tags) with a simple CSS variable lookup in `applyFont()`
- Updated inline FOUC-prevention script in `layout.tsx` to set `--font-custom` to the appropriate CSS variable instead of injecting a Google Fonts `<link>` tag
- Removed `googleFamily` from `FontOption` interface, added `cssVar` field
- Updated settings page font picker preview to use CSS variables

### S-013: font-display: optional for secondary fonts
- All 9 secondary fonts use `display: 'optional'`
- Plus Jakarta Sans (primary) and JetBrains Mono (code) keep `display: 'swap'`
