# Advanced Chatbox — Design Spec

## Overview

A full-page general-purpose AI chat experience at `/chat`, added as a new navigation item in the sidebar. Users can have multi-turn conversations with AI, manage multiple conversation threads, preview generated HTML live, and get professional rendering of code, math, diagrams, and tables.

**Vibe:** Warm Workspace — inviting, comfortable, soft corners, gentle spacing, warm neutral tones. Like Notion or Arc. Professional but not cold.

**Tone:** The AI is friendly, straight-forward, no BS, warm, and conversational. Short responses. No fluff. Baked into a fixed system prompt — no user-facing tone picker.

---

## 1. Navigation & Routing

### Sidebar Integration
- New nav item: **Chat** with a chat/message icon
- Placed between Content Library and Settings in the sidebar
- Active state follows existing sidebar patterns (blue highlight, icon fill)
- Route: `/chat`
- Mobile: appears in the bottom nav bar as 4th item

### Route Structure
- `/chat` — main chat page (loads last-opened conversation or new chat)

---

## 2. Page Layout

### Desktop (≥768px)
```
┌──────────┬─────────────────────────────────┐
│ Sidebar  │                                 │
│ (240px)  │        Chat Area                │
│          │                                 │
│ "Chats"  │  ┌───────────────────────────┐  │
│  [+]     │  │   Messages (scrollable)   │  │
│          │  │                           │  │
│ ┌──────┐ │  │   user: ...               │  │
│ │conv 1│ │  │   ai: ...                 │  │
│ │conv 2│ │  │   user: ...               │  │
│ │conv 3│ │  │   ai: ...                 │  │
│ │      │ │  │                           │  │
│ └──────┘ │  ├───────────────────────────┤  │
│          │  │   Input Composer           │  │
│          │  └───────────────────────────┘  │
└──────────┴─────────────────────────────────┘
```

- **Conversation sidebar:** 240px width, left side, scrollable list
- **Chat area:** remaining width, messages + input composer
- Conversation sidebar shares space with the app's main sidebar (app nav collapses or chat sidebar nests inside)

### Mobile (<768px)
- Full-screen immersive chat (no conversation sidebar visible)
- Hamburger icon in chat header opens conversation list as a full-screen overlay
- Input bar fixed at bottom, respects safe area insets
- Back arrow to return to conversation list

---

## 3. Conversation Sidebar

### Header
- "Chats" text label (left-aligned)
- "+" icon button (right-aligned) — creates new conversation immediately
- No branding, no search bar

### Conversation List
- Flat list, sorted by last-opened (most recent at top)
- Each item shows: auto-generated title (truncated), relative timestamp
- Active conversation has subtle background highlight
- Right-click or three-dot menu per item: **Rename**, **Delete**
- Rename: inline text editing in the sidebar
- Delete: confirmation dialog, then permanent removal

### Auto-Titling
- After the first AI response, generate a short title from the conversation content
- Title stored with the conversation in localStorage
- Editable via rename

### Empty State (First-Time)
- "New Chat" button centered
- Subtle text: "Your conversations will appear here."
- No onboarding cards, no ghost conversations

---

## 4. Chat Area

### Message Display
- Messages in a vertically scrollable container
- Max content width ~700px, centered within the chat area
- User messages: right-aligned, subtle background (--color-accent at 10% opacity or light surface)
- AI messages: left-aligned, no background or very subtle card surface
- Small avatar/icon for AI messages (optional, could be app icon or a simple dot)
- Timestamp on hover or as subtle text below message groups

### Thinking Display
- Appears as a collapsible block above the AI response
- **Collapsed by default** — shows a small "Thinking..." label with expand chevron
- User clicks to expand and see the full chain-of-thought
- Styled with subtle monospace font, muted text color
- No violet/purple styling — keep it neutral (grey tones)

### Rich Content Rendering
All AI responses render as full markdown with:
- **LaTeX math:** KaTeX for inline `$...$` and block `$$...$$` equations
- **Syntax-highlighted code:** highlight.js with language detection, copy button per block
- **Tables:** Styled HTML tables matching the design system
- **Mermaid diagrams:** Rendered inline using Mermaid.js (lazy-loaded)
- **Standard markdown:** Headers, lists, bold, italic, links, blockquotes, horizontal rules

### Message Actions (on hover)
- **Copy:** Copies raw markdown to clipboard, toast confirmation
- **Regenerate:** Re-runs the AI for the same user message, replaces response
- Actions appear as small icon buttons on hover, top-right of the message

### New Chat Welcome
- Centered in the chat area when no messages exist
- Animated welcome text (typewriter or fade-in): "What can I help you with?"
- Input auto-focused
- Welcome disappears after first message sent

---

## 5. Input Composer

### Layout
- Fixed at the bottom of the chat area
- Clean auto-expanding textarea: starts as single line, grows to max ~5 lines
- Rounded corners, subtle border matching design system
- On focus: mini toolbar appears below the textarea

### Mini Toolbar (appears on focus)
- Attach file button (📎 icon)
- Code block insert button (inserts triple backtick template)
- Send button (right side, primary color, enabled only when input has content)

### Behavior
- **Enter** → Send message
- **Shift+Enter** → New line
- **Esc** → Stop active generation
- Send button animates to a stop button (■) during generation
- Input disabled while AI is streaming (re-enables on completion or stop)

### File Attachments
- Click attach or drag-and-drop files onto the input area
- Attached files show as **minimal badges** above the input: filename as clickable text + "✕" remove button
- Click filename → overlay modal showing file preview (image renders, text shows content, PDF shows embedded viewer)
- Files sent as base64 in the message payload
- Supported: images (png, jpg, gif, webp), text files, PDFs
- Max file size: reasonable limit based on localStorage constraints

---

## 6. HTML Live Preview

### Detection
- When AI response contains an HTML code block (```html), the preview system activates
- Detection is automatic — no user action needed

### Inline Thumbnail
- Below the code block, render a **~300px tall sandboxed iframe** showing the live preview
- Subtle border, rounded corners
- "Expand" button overlay in top-right corner
- "Edit" button overlay for opening the code editor

### Full-Screen Preview Modal
- Click thumbnail or "Expand" to open a near-full-screen modal
- **Top bar:** viewport switcher (Desktop 1280px / Tablet 768px / Mobile 375px) + close button
- **Main area:** sandboxed iframe rendering the HTML at selected viewport width
- Smooth transition when switching viewports

### Mini CodePen Editor
- Accessible via "Edit" button on the thumbnail or a tab in the full-screen modal
- **Split view:** code editor on the left, live preview on the right
- Code editor: syntax-highlighted textarea with line numbers
- Changes update the preview in real-time (debounced ~300ms)
- User can freely edit HTML, CSS, and inline JS
- No save — edits are ephemeral (user copies code if they want to keep changes)

### Click-to-Highlight + Chat Refine
- In the preview (inline or full-screen), user can **click any element**
- Clicked element gets a highlight outline (blue dashed border)
- A floating "Refine this" button appears near the highlighted element
- Clicking "Refine this" pre-fills the chat input with context: the element's tag/class info and the full HTML
- User adds their refinement request (e.g., "make this section wider with more padding") and sends
- AI responds with updated HTML, new preview renders automatically

### External Resources
- iframe allows full external access: CDN scripts (Tailwind, Bootstrap, GSAP, etc.), Google Fonts, Unsplash images, any public URL
- No CSP restrictions on the preview iframe (sandbox with `allow-scripts allow-same-origin` for CDN access)

### Design Constraints for Generated HTML
- System prompt instructs the AI to generate clean, professional, spacious UIs
- **No AI-aesthetic colors:** no gradients, no purple/violet hues, no neon accents
- Preference for neutral palettes, generous whitespace, professional typography
- This is enforced via the system prompt, not technically

---

## 7. Streaming & API

### API Integration
- Reuse existing `/api/minimax` route and `streamCompletion()` client
- Chat sends the conversation history as messages array
- System prompt prepended to every request

### System Prompt
```
You are a helpful, friendly, and straight-forward assistant. Be warm and conversational, but concise — no fluff, no filler. Give the user exactly what they need. When generating HTML, create clean, professional, spacious UIs with neutral color palettes. Never use AI-aesthetic styling (gradients, purple hues, neon accents). Prefer generous whitespace, clean typography, and thoughtful layout.
```

### Streaming Behavior
- Tokens stream in and markdown renders live (real-time rendering as tokens arrive)
- Thinking tokens route to the collapsible thinking block
- Content tokens render as markdown progressively
- Code blocks accumulate until closed, then syntax highlight + preview render

### Context Management
- **Sliding window:** Keep system prompt + last N messages (e.g., 20 messages or ~4000 tokens of history)
- **Background auto-summarize:** When a conversation exceeds the window:
  1. Check if a summary already exists for the older messages (stored in conversation metadata in localStorage)
  2. If no summary exists, fire a background API call to summarize the dropped messages into a condensed context block (~200 tokens)
  3. Cache the summary in the conversation's localStorage entry with a `summarizedUpTo` message index
  4. On subsequent requests: system prompt + cached summary + recent messages within window
  5. Summary is only regenerated when new messages fall outside the window AND haven't been summarized yet
  - This ensures no redundant summarization and minimal token waste

---

## 8. State & Storage

### Data Model
```typescript
interface ChatConversation {
  id: string;                    // uuid
  title: string;                 // auto-generated or user-renamed
  messages: ChatMessage[];
  createdAt: number;             // timestamp
  lastOpenedAt: number;          // timestamp, used for sorting
  summary?: string;              // cached context summary
  summarizedUpTo?: number;       // message index up to which summary covers
}

interface ChatMessage {
  id: string;                    // uuid
  role: 'user' | 'assistant';
  content: string;               // raw markdown
  thinking?: string;             // chain-of-thought text
  attachments?: ChatAttachment[];
  timestamp: number;
}

interface ChatAttachment {
  name: string;
  type: string;                  // MIME type
  size: number;
  data: string;                  // base64
}
```

### localStorage Strategy
- Key: `news13n_chat_conversations` — JSON array of ChatConversation
- Key: `news13n_chat_active` — ID of the currently active conversation
- Shares the existing 5MB localStorage budget with content storage

### Auto-Cleanup
- Monitor storage usage using existing `getStorageStats()` / `shouldWarnStorage()` utilities
- When approaching 80% capacity:
  1. Show a subtle warning banner in the chat: "Storage is getting full. Oldest conversations may be removed."
  2. Auto-delete oldest conversations (by `lastOpenedAt`) until usage drops below 70%
  3. Never delete the currently active conversation
- Storage stats visible in Settings page (extend existing storage gauge)

### Integration with GenerationContext
- Chat sets `isGenerating: true` during streaming (prevents accidental navigation)
- Chat does NOT set `isDirty` (conversations auto-save after each message)

---

## 9. Animations & Transitions

### Design Principles
- Spring-based physics for organic feel
- Minimal color usage in animations — rely on movement and opacity
- Rich micro-interactions but restrained — every animation has purpose

### Message Animations
- **New user message:** slides in from right with spring physics (slight overshoot, settles in ~300ms)
- **New AI message:** fades in + slides up gently from left (200ms ease-out)
- **Thinking block expand/collapse:** spring accordion animation (height + opacity)

### Conversation Switching
- Quick crossfade: 150ms fade-out of current messages → 150ms fade-in of new messages
- Subtle, flowy, not sudden
- New messages stagger-fade (first 5 visible messages cascade in with 30ms delay each)

### Streaming
- Tokens appear with no individual animation (just append — animation on tokens is distracting)
- Cursor blink at the end of streaming text (thin bar, 1s blink cycle)
- Code blocks slide-expand smoothly when the closing fence arrives

### Micro-interactions
- Hover on messages: action buttons fade in (opacity 0→1, 150ms)
- Copy button: morphs to checkmark on success (200ms)
- Send button: subtle scale pulse on click (1.0→1.05→1.0, 150ms)
- Conversation list items: hover lifts slightly (translateY -1px, subtle shadow increase)
- Input focus: border color transitions smoothly (200ms)
- Scroll-to-bottom FAB: fades in/out with slight scale (0.9→1.0)
- File badge appear: scale pop-in (0→1.05→1.0, spring)
- Delete confirmation: modal fades in with slight scale-up from center

### Auto-Scroll
- Smooth scrolling during streaming (CSS `scroll-behavior: smooth`)
- Auto-scroll active when user is within ~100px of bottom
- If user scrolls up: auto-scroll pauses, scroll-to-bottom FAB appears
- FAB shows a subtle "↓" arrow
- Clicking FAB smooth-scrolls to bottom and re-enables auto-scroll

---

## 10. Dark Mode

- Uses existing CSS variables from the design system — no new colors
- User messages: slightly lighter surface in dark mode
- AI messages: card/surface background
- Code blocks: dark theme from existing highlight.js configuration
- Thinking block: neutral dark surface, muted text
- All borders, backgrounds, text colors from existing `--color-*` tokens
- HTML preview iframe: unaffected (renders its own styles)

---

## 11. Error Handling

### Strategy: Silent Auto-Retry + Inline Fallback
- On API error: automatically retry up to 3 times with exponential backoff (2s, 5s, 10s)
- During retries: typing indicator continues, user sees nothing unusual
- Retryable errors: 429 (rate limit), 500, 502, 503 (server errors), network failures
- If all retries fail:
  - Inline error message in the chat flow (red-tinted subtle bubble)
  - "Something went wrong." + **[Retry]** button
  - User's message stays in the conversation (not lost)
- On network recovery: no auto-retry of failed messages (user clicks Retry manually)
- Non-retryable errors (400, 401, 403): show inline error immediately, no retry

---

## 12. Mobile Experience

### Full-Screen Immersive
- Chat area takes 100% of the screen (below app header/nav)
- No conversation sidebar visible
- Chat header bar: hamburger menu (left) + conversation title (center) + new chat "+" (right)
- Hamburger opens conversation list as full-screen overlay with slide-in-from-left animation
- Input bar fixed to bottom, above keyboard when active
- Safe area insets respected (notch, home indicator)

### Touch Interactions
- Long-press on message for action menu (Copy, Regenerate)
- Swipe conversation list items for quick delete (swipe left reveals red delete)
- Pull-down on conversation list to... nothing (no refresh needed, it's local)
- 44px minimum touch targets on all interactive elements

---

## 13. Keyboard Shortcuts

Essential only, registered on the `/chat` route:

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `Esc` | Stop active generation |

These integrate with the existing "?" keyboard shortcuts modal.

---

## 14. Files & Components

### New Files
- `src/app/chat/page.tsx` — Chat page component
- `src/components/chat/ChatSidebar.tsx` — Conversation list sidebar
- `src/components/chat/ChatArea.tsx` — Message display + input composer
- `src/components/chat/ChatMessage.tsx` — Individual message bubble with rendering
- `src/components/chat/ChatInput.tsx` — Input composer with toolbar
- `src/components/chat/ThinkingBlock.tsx` — Collapsible thinking display
- `src/components/chat/HtmlPreview.tsx` — Inline thumbnail + full-screen preview modal + editor
- `src/components/chat/ScrollFAB.tsx` — Scroll-to-bottom floating action button
- `src/lib/chat-storage.ts` — Chat-specific localStorage operations (CRUD, auto-cleanup, summarization cache)
- `src/lib/chat-context.tsx` — React context for active conversation state

### Modified Files
- `src/components/Sidebar.tsx` — Add Chat nav item
- `src/app/globals.css` — Add chat-specific animations and styles
- `src/app/settings/page.tsx` — Extend storage gauge to include chat data

### Reused
- `src/lib/ai/client.ts` — `streamCompletion()` for API calls
- `src/app/api/minimax/route.ts` — Existing API route
- `src/lib/generation-context.tsx` — `isGenerating` flag during streaming
- `src/components/ui/*` — Button, Modal, Toast, Skeleton components
- highlight.js, Mermaid.js, KaTeX (add KaTeX as new dependency)
