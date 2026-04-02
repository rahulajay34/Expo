# Advanced Chatbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-page general-purpose AI chat at `/chat` with multi-conversation management, live markdown/HTML preview, and a warm workspace aesthetic.

**Architecture:** New `/chat` route with a conversation sidebar (240px) + chat area. Reuses existing Minimax streaming API. Chat state stored in localStorage with sliding-window context management and background auto-summarization. HTML preview uses sandboxed iframes with a mini CodePen editor.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, existing Minimax API, react-markdown + rehype/remark plugins, KaTeX (new dep), highlight.js, Mermaid.js, localStorage.

**Spec:** `docs/superpowers/specs/2026-04-02-advanced-chatbox-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/chat-types.ts` | Chat-specific TypeScript interfaces (ChatConversation, ChatMessage, ChatAttachment) |
| `src/lib/chat-storage.ts` | localStorage CRUD for conversations, auto-cleanup, summary caching |
| `src/lib/chat-context.tsx` | React context for active conversation, conversation list, dispatch actions |
| `src/app/chat/page.tsx` | Chat page component — orchestrates sidebar + chat area |
| `src/components/chat/ChatSidebar.tsx` | Conversation list sidebar (240px, desktop) + mobile overlay |
| `src/components/chat/ChatArea.tsx` | Message list + scroll management + welcome screen |
| `src/components/chat/ChatMessage.tsx` | Individual message bubble with rich markdown rendering |
| `src/components/chat/ChatInput.tsx` | Auto-expanding input composer with toolbar + file attachments |
| `src/components/chat/ThinkingBlock.tsx` | Collapsible chain-of-thought display |
| `src/components/chat/HtmlPreview.tsx` | Inline iframe thumbnail + full-screen modal + CodePen editor + click-to-highlight |
| `src/components/chat/ScrollFAB.tsx` | Scroll-to-bottom floating action button |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/Sidebar.tsx` | Add Chat nav item to NAV_ITEMS + MobileBottomNav |
| `src/app/globals.css` | Add chat-specific animations (message slide-in, crossfade, spring accordion, cursor blink) |
| `src/app/settings/page.tsx` | Extend storage gauge to include chat data |
| `package.json` | Add `katex` + `rehype-katex` dependencies |

---

## Task 1: Types & Dependencies

**Files:**
- Create: `src/lib/chat-types.ts`
- Modify: `package.json`

- [ ] **Step 1: Install KaTeX dependency**

```bash
npm install katex rehype-katex
npm install -D @types/katex
```

- [ ] **Step 2: Create chat type definitions**

Create `src/lib/chat-types.ts`:

```typescript
export interface ChatAttachment {
  name: string;
  type: string;       // MIME type
  size: number;       // bytes
  data: string;       // base64
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;           // raw markdown
  thinking?: string;         // chain-of-thought
  attachments?: ChatAttachment[];
  timestamp: number;
}

export interface ChatConversation {
  id: string;
  title: string;             // auto-generated or user-renamed
  messages: ChatMessage[];
  createdAt: number;
  lastOpenedAt: number;      // used for sorting
  summary?: string;          // cached context summary for older messages
  summarizedUpTo?: number;   // message index up to which summary covers
}

export const CHAT_STORAGE_KEY = 'news13n_chat_conversations';
export const CHAT_ACTIVE_KEY = 'news13n_chat_active';
export const CHAT_WINDOW_SIZE = 20; // max messages in context window
export const CHAT_SYSTEM_PROMPT = `You are a helpful, friendly, and straight-forward assistant. Be warm and conversational, but concise — no fluff, no filler. Give the user exactly what they need. When generating HTML, create clean, professional, spacious UIs with neutral color palettes. Never use AI-aesthetic styling (gradients, purple hues, neon accents). Prefer generous whitespace, clean typography, and thoughtful layout.`;
```

- [ ] **Step 3: Verify types compile**

```bash
cd /Users/rahul/Desktop/Expo && npx tsc --noEmit src/lib/chat-types.ts
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/chat-types.ts package.json package-lock.json
git commit -m "feat(chat): add chat type definitions and KaTeX dependency"
```

---

## Task 2: Chat Storage Layer

**Files:**
- Create: `src/lib/chat-storage.ts`
- Read: `src/lib/storage.ts` (for pattern reference)
- Read: `src/lib/chat-types.ts`

- [ ] **Step 1: Create chat storage module**

Create `src/lib/chat-storage.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import {
  ChatConversation,
  ChatMessage,
  ChatAttachment,
  CHAT_STORAGE_KEY,
  CHAT_ACTIVE_KEY,
} from '@/lib/chat-types';

// --- Read ---

export function getAllConversations(): ChatConversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c: unknown) =>
        c !== null &&
        typeof c === 'object' &&
        'id' in (c as Record<string, unknown>) &&
        'messages' in (c as Record<string, unknown>)
    ) as ChatConversation[];
  } catch {
    console.warn('[chat-storage] Failed to parse conversations');
    return [];
  }
}

export function getConversationById(id: string): ChatConversation | undefined {
  return getAllConversations().find((c) => c.id === id);
}

export function getActiveConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CHAT_ACTIVE_KEY);
}

export function setActiveConversationId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(CHAT_ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(CHAT_ACTIVE_KEY);
  }
}

// --- Write ---

function saveAllConversations(conversations: ChatConversation[]): void {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // Auto-cleanup: remove oldest conversations until it fits
      const sorted = [...conversations].sort(
        (a, b) => a.lastOpenedAt - b.lastOpenedAt
      );
      while (sorted.length > 1) {
        sorted.shift(); // remove oldest
        try {
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sorted));
          return;
        } catch {
          continue;
        }
      }
    }
    throw e;
  }
}

export function createConversation(): ChatConversation {
  const now = Date.now();
  const conversation: ChatConversation = {
    id: uuidv4(),
    title: 'New Chat',
    messages: [],
    createdAt: now,
    lastOpenedAt: now,
  };
  const all = getAllConversations();
  all.unshift(conversation);
  saveAllConversations(all);
  setActiveConversationId(conversation.id);
  return conversation;
}

export function updateConversation(
  id: string,
  updates: Partial<Omit<ChatConversation, 'id'>>
): ChatConversation | null {
  const all = getAllConversations();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  saveAllConversations(all);
  return all[idx];
}

export function touchConversation(id: string): void {
  updateConversation(id, { lastOpenedAt: Date.now() });
}

export function addMessage(
  conversationId: string,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): ChatMessage {
  const msg: ChatMessage = {
    ...message,
    id: uuidv4(),
    timestamp: Date.now(),
  };
  const conv = getConversationById(conversationId);
  if (!conv) throw new Error(`Conversation ${conversationId} not found`);
  const updatedMessages = [...conv.messages, msg];
  updateConversation(conversationId, {
    messages: updatedMessages,
    lastOpenedAt: Date.now(),
  });
  return msg;
}

export function updateLastAssistantMessage(
  conversationId: string,
  content: string,
  thinking?: string
): void {
  const conv = getConversationById(conversationId);
  if (!conv) return;
  const messages = [...conv.messages];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      messages[i] = { ...messages[i], content, thinking };
      break;
    }
  }
  updateConversation(conversationId, { messages });
}

export function replaceLastAssistantMessage(
  conversationId: string,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): ChatMessage {
  const conv = getConversationById(conversationId);
  if (!conv) throw new Error(`Conversation ${conversationId} not found`);
  const messages = [...conv.messages];
  // Remove last assistant message
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      messages.splice(i, 1);
      break;
    }
  }
  const msg: ChatMessage = {
    ...message,
    id: uuidv4(),
    timestamp: Date.now(),
  };
  messages.push(msg);
  updateConversation(conversationId, { messages, lastOpenedAt: Date.now() });
  return msg;
}

export function deleteConversation(id: string): boolean {
  const all = getAllConversations();
  const filtered = all.filter((c) => c.id !== id);
  if (filtered.length === all.length) return false;
  saveAllConversations(filtered);
  if (getActiveConversationId() === id) {
    setActiveConversationId(filtered[0]?.id ?? null);
  }
  return true;
}

export function renameConversation(id: string, title: string): void {
  updateConversation(id, { title });
}

// --- Auto-title ---

export function generateTitle(firstUserMessage: string): string {
  // Take first 50 chars, trim to last word boundary
  const trimmed = firstUserMessage.slice(0, 50).trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace > 20 && trimmed.length >= 50) {
    return trimmed.slice(0, lastSpace) + '…';
  }
  return trimmed || 'New Chat';
}

// --- Context summarization cache ---

export function getSummary(
  conversationId: string
): { summary: string; summarizedUpTo: number } | null {
  const conv = getConversationById(conversationId);
  if (!conv || !conv.summary || conv.summarizedUpTo === undefined) return null;
  return { summary: conv.summary, summarizedUpTo: conv.summarizedUpTo };
}

export function saveSummary(
  conversationId: string,
  summary: string,
  summarizedUpTo: number
): void {
  updateConversation(conversationId, { summary, summarizedUpTo });
}

// --- Storage stats ---

export function getChatStorageBytes(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(CHAT_STORAGE_KEY) || '';
  return new Blob([raw]).size;
}

// --- Auto-cleanup ---

export function autoCleanupIfNeeded(activeId?: string | null): void {
  if (typeof window === 'undefined') return;
  const total = Object.keys(localStorage).reduce((sum, key) => {
    return sum + (localStorage.getItem(key)?.length ?? 0) * 2; // rough UTF-16 size
  }, 0);
  const maxBytes = 5 * 1024 * 1024;
  if (total / maxBytes < 0.8) return; // under 80%, no action

  const all = getAllConversations();
  const sorted = [...all].sort((a, b) => a.lastOpenedAt - b.lastOpenedAt);
  const toRemove: string[] = [];

  for (const conv of sorted) {
    if (conv.id === activeId) continue; // never delete active
    toRemove.push(conv.id);
    // Check if removing this would drop below 70%
    const remaining = all.filter((c) => !toRemove.includes(c.id));
    const newRaw = JSON.stringify(remaining);
    const otherBytes = total - new Blob([localStorage.getItem(CHAT_STORAGE_KEY) || '']).size * 2;
    if ((otherBytes + newRaw.length * 2) / maxBytes < 0.7) break;
  }

  if (toRemove.length > 0) {
    const remaining = all.filter((c) => !toRemove.includes(c.id));
    saveAllConversations(remaining);
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/rahul/Desktop/Expo && npx tsc --noEmit src/lib/chat-storage.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/chat-storage.ts
git commit -m "feat(chat): add chat localStorage storage layer with auto-cleanup"
```

---

## Task 3: Chat Context Provider

**Files:**
- Create: `src/lib/chat-context.tsx`
- Read: `src/lib/generation-context.tsx` (pattern reference)
- Read: `src/lib/chat-storage.ts`
- Read: `src/lib/chat-types.ts`

- [ ] **Step 1: Create chat context**

Create `src/lib/chat-context.tsx`:

```typescript
'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  ChatConversation,
  ChatMessage,
} from '@/lib/chat-types';
import {
  getAllConversations,
  getActiveConversationId,
  setActiveConversationId,
  createConversation as storageCreateConversation,
  deleteConversation as storageDeleteConversation,
  renameConversation as storageRenameConversation,
  touchConversation,
  addMessage as storageAddMessage,
  updateLastAssistantMessage as storageUpdateLastAssistant,
  replaceLastAssistantMessage as storageReplaceLastAssistant,
  updateConversation,
  getConversationById,
  autoCleanupIfNeeded,
  generateTitle,
} from '@/lib/chat-storage';

interface ChatContextValue {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  activeConversation: ChatConversation | null;
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;

  // Actions
  createConversation: () => ChatConversation;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  addUserMessage: (
    content: string,
    attachments?: ChatMessage['attachments']
  ) => ChatMessage;
  addAssistantMessage: (content: string, thinking?: string) => ChatMessage;
  updateStreamingMessage: (content: string, thinking?: string) => void;
  regenerateLastResponse: () => ChatMessage[] | null;
  refreshConversations: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const convs = getAllConversations();
    setConversations(convs);
    const activeId = getActiveConversationId();
    if (activeId && convs.some((c) => c.id === activeId)) {
      setActiveId(activeId);
    } else if (convs.length > 0) {
      setActiveId(convs[0].id);
      setActiveConversationId(convs[0].id);
    }
  }, []);

  const refreshConversations = useCallback(() => {
    setConversations(getAllConversations());
  }, []);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;

  const createConversation = useCallback(() => {
    autoCleanupIfNeeded(activeConversationId);
    const conv = storageCreateConversation();
    setActiveId(conv.id);
    refreshConversations();
    return conv;
  }, [activeConversationId, refreshConversations]);

  const switchConversation = useCallback(
    (id: string) => {
      touchConversation(id);
      setActiveConversationId(id);
      setActiveId(id);
      refreshConversations();
    },
    [refreshConversations]
  );

  const deleteConversation = useCallback(
    (id: string) => {
      storageDeleteConversation(id);
      refreshConversations();
      // If we deleted the active one, switch
      if (id === activeConversationId) {
        const remaining = getAllConversations();
        const newActiveId = remaining[0]?.id ?? null;
        setActiveId(newActiveId);
        setActiveConversationId(newActiveId);
      }
    },
    [activeConversationId, refreshConversations]
  );

  const renameConversation = useCallback(
    (id: string, title: string) => {
      storageRenameConversation(id, title);
      refreshConversations();
    },
    [refreshConversations]
  );

  const addUserMessage = useCallback(
    (content: string, attachments?: ChatMessage['attachments']) => {
      if (!activeConversationId) throw new Error('No active conversation');
      const msg = storageAddMessage(activeConversationId, {
        role: 'user',
        content,
        attachments,
      });
      // Auto-title on first user message
      const conv = getConversationById(activeConversationId);
      if (conv && conv.messages.filter((m) => m.role === 'user').length === 1) {
        storageRenameConversation(activeConversationId, generateTitle(content));
      }
      refreshConversations();
      return msg;
    },
    [activeConversationId, refreshConversations]
  );

  const addAssistantMessage = useCallback(
    (content: string, thinking?: string) => {
      if (!activeConversationId) throw new Error('No active conversation');
      const msg = storageAddMessage(activeConversationId, {
        role: 'assistant',
        content,
        thinking,
      });
      refreshConversations();
      return msg;
    },
    [activeConversationId, refreshConversations]
  );

  const updateStreamingMessage = useCallback(
    (content: string, thinking?: string) => {
      if (!activeConversationId) return;
      storageUpdateLastAssistant(activeConversationId, content, thinking);
      refreshConversations();
    },
    [activeConversationId, refreshConversations]
  );

  const regenerateLastResponse = useCallback(() => {
    if (!activeConversationId) return null;
    const conv = getConversationById(activeConversationId);
    if (!conv) return null;
    // Find the last user message and remove everything after it
    const messages = [...conv.messages];
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return null;
    const trimmed = messages.slice(0, lastUserIdx + 1);
    const updates: Partial<Omit<ChatConversation, 'id'>> = {
      messages: trimmed,
      lastOpenedAt: Date.now(),
    };
    // Preserve summary if it's still valid
    if (conv.summary && conv.summarizedUpTo !== undefined && conv.summarizedUpTo < lastUserIdx) {
      updates.summary = conv.summary;
      updates.summarizedUpTo = conv.summarizedUpTo;
    }
    updateConversation(activeConversationId, updates);
    refreshConversations();
    return trimmed;
  }, [activeConversationId, refreshConversations]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        isStreaming,
        setIsStreaming,
        createConversation,
        switchConversation,
        deleteConversation,
        renameConversation,
        addUserMessage,
        addAssistantMessage,
        updateStreamingMessage,
        regenerateLastResponse,
        refreshConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
```

- [ ] **Step 2: Wire ChatProvider into app layout**

Modify `src/app/layout.tsx` — add ChatProvider inside the existing provider stack, wrapping after GenerationProvider:

```typescript
// Add import at top:
import { ChatProvider } from '@/lib/chat-context';

// In the JSX, wrap inside GenerationProvider:
<GenerationProvider>
  <ChatProvider>
    <ToastProvider>
      {/* ... existing children ... */}
    </ToastProvider>
  </ChatProvider>
</GenerationProvider>
```

- [ ] **Step 3: Verify it compiles**

```bash
cd /Users/rahul/Desktop/Expo && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/chat-context.tsx src/app/layout.tsx
git commit -m "feat(chat): add ChatProvider context with conversation management"
```

---

## Task 4: CSS Animations for Chat

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add chat-specific animations to globals.css**

Append to the `@keyframes` section in `src/app/globals.css`:

```css
/* Chat animations */
@keyframes chat-msg-user {
  0% { opacity: 0; transform: translateX(12px); }
  60% { transform: translateX(-3px); }
  100% { opacity: 1; transform: translateX(0); }
}

@keyframes chat-msg-ai {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes chat-crossfade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes chat-crossfade-out {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes chat-stagger-in {
  0% { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes chat-thinking-expand {
  0% { opacity: 0; max-height: 0; }
  100% { opacity: 1; max-height: 500px; }
}

@keyframes chat-thinking-collapse {
  0% { opacity: 1; max-height: 500px; }
  100% { opacity: 0; max-height: 0; }
}

@keyframes chat-cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes chat-fab-in {
  0% { opacity: 0; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes chat-badge-pop {
  0% { transform: scale(0); }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes chat-code-expand {
  0% { opacity: 0; max-height: 0; }
  100% { opacity: 1; max-height: 2000px; }
}

/* Chat animation classes */
.chat-msg-user-enter {
  animation: chat-msg-user 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.chat-msg-ai-enter {
  animation: chat-msg-ai 200ms ease-out forwards;
}

.chat-crossfade-in {
  animation: chat-crossfade-in 150ms ease-out forwards;
}

.chat-crossfade-out {
  animation: chat-crossfade-out 150ms ease-in forwards;
}

.chat-stagger-in {
  animation: chat-stagger-in 200ms ease-out forwards;
}

.chat-thinking-open {
  animation: chat-thinking-expand 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  overflow: hidden;
}

.chat-thinking-closed {
  animation: chat-thinking-collapse 200ms ease-in forwards;
  overflow: hidden;
}

.chat-streaming-cursor::after {
  content: '|';
  animation: chat-cursor-blink 1s step-end infinite;
  color: var(--text-secondary);
  font-weight: 300;
}

.chat-fab-enter {
  animation: chat-fab-in 200ms ease-out forwards;
}

.chat-badge-enter {
  animation: chat-badge-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.chat-code-expand {
  animation: chat-code-expand 300ms ease-out forwards;
  overflow: hidden;
}

/* Chat conversation list hover */
.chat-conv-item {
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.chat-conv-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

/* Chat action buttons */
.chat-actions {
  opacity: 0;
  transition: opacity 150ms ease;
}
.group:hover .chat-actions {
  opacity: 1;
}

/* Chat input focus transition */
.chat-input-wrapper {
  transition: border-color 200ms ease, box-shadow 200ms ease;
}

/* Copy button morph */
.chat-copy-success {
  transition: all 200ms ease;
}
```

- [ ] **Step 2: Verify CSS is valid**

```bash
cd /Users/rahul/Desktop/Expo && npm run build 2>&1 | head -20
```

Expected: Build starts without CSS errors. (Ctrl+C after confirming.)

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(chat): add chat animation keyframes and utility classes"
```

---

## Task 5: ThinkingBlock Component

**Files:**
- Create: `src/components/chat/ThinkingBlock.tsx`

- [ ] **Step 1: Create ThinkingBlock component**

```bash
mkdir -p /Users/rahul/Desktop/Expo/src/components/chat
```

Create `src/components/chat/ThinkingBlock.tsx`:

```typescript
'use client';

import { useState } from 'react';

interface ThinkingBlockProps {
  thinking: string;
  isStreaming?: boolean;
}

export function ThinkingBlock({ thinking, isStreaming }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (!thinking) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${
            expanded ? 'rotate-90' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span>
          {isStreaming ? 'Thinking…' : 'Thought process'}
        </span>
      </button>
      {expanded && (
        <div className="chat-thinking-open mt-1.5 ml-4 pl-3 border-l-2 border-border">
          <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
            {thinking}
          </pre>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/rahul/Desktop/Expo && npx tsc --noEmit src/components/chat/ThinkingBlock.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ThinkingBlock.tsx
git commit -m "feat(chat): add collapsible ThinkingBlock component"
```

---

## Task 6: ScrollFAB Component

**Files:**
- Create: `src/components/chat/ScrollFAB.tsx`

- [ ] **Step 1: Create ScrollFAB component**

Create `src/components/chat/ScrollFAB.tsx`:

```typescript
'use client';

interface ScrollFABProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollFAB({ visible, onClick }: ScrollFABProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="chat-fab-enter absolute bottom-20 right-4 w-9 h-9 rounded-full bg-card-bg border border-border shadow-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:shadow-lg transition-shadow"
      aria-label="Scroll to bottom"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/ScrollFAB.tsx
git commit -m "feat(chat): add scroll-to-bottom FAB component"
```

---

## Task 7: ChatMessage Component (Rich Rendering)

**Files:**
- Create: `src/components/chat/ChatMessage.tsx`
- Read: `src/components/MarkdownPreview.tsx` (pattern reference)
- Read: `src/components/chat/ThinkingBlock.tsx`

- [ ] **Step 1: Create ChatMessage component**

Create `src/components/chat/ChatMessage.tsx`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ChatMessage as ChatMessageType } from '@/lib/chat-types';
import { ThinkingBlock } from './ThinkingBlock';
import { HtmlPreview } from './HtmlPreview';
import { useToast } from '@/components/ui/Toast';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  conversationId: string;
}

export function ChatMessage({
  message,
  isStreaming,
  onRegenerate,
  conversationId,
}: ChatMessageProps) {
  const { showToast } = useToast();
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const isUser = message.role === 'user';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopyState('copied');
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  }, [message.content, showToast]);

  // Extract HTML code blocks for preview
  const htmlBlocks: string[] = [];
  const htmlBlockRegex = /```html\n([\s\S]*?)```/g;
  let match;
  while ((match = htmlBlockRegex.exec(message.content)) !== null) {
    htmlBlocks.push(match[1]);
  }

  return (
    <div
      className={`group flex ${isUser ? 'justify-end' : 'justify-start'} ${
        isUser ? 'chat-msg-user-enter' : 'chat-msg-ai-enter'
      }`}
    >
      <div
        className={`relative max-w-[85%] ${
          isUser
            ? 'bg-accent/10 rounded-2xl rounded-br-md px-4 py-2.5'
            : 'rounded-2xl rounded-bl-md px-1 py-1'
        }`}
      >
        {/* Thinking block for AI messages */}
        {!isUser && message.thinking && (
          <ThinkingBlock thinking={message.thinking} isStreaming={isStreaming} />
        )}

        {/* Attachments for user messages */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.attachments.map((att, i) => (
              <span
                key={i}
                className="text-xs bg-accent/5 border border-accent/20 rounded px-2 py-0.5 text-text-secondary"
              >
                {att.name}
              </span>
            ))}
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <div className="text-sm text-text-primary whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="markdown-body text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeHighlight, rehypeRaw, rehypeKatex]}
              components={{
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full border-collapse border border-border rounded-md text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-border bg-sidebar px-3 py-2 text-left text-xs font-semibold text-text-primary">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-3 py-2 text-text-secondary">
                    {children}
                  </td>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-3 border-accent/40 bg-accent/5 pl-4 py-2 my-3 rounded-r text-text-secondary">
                    {children}
                  </blockquote>
                ),
                code: ({ className, children, ...props }) => {
                  const isBlock = className?.includes('language-');
                  if (isBlock) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="bg-code-bg border border-border rounded px-1.5 py-0.5 text-xs font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-code-bg border border-border rounded-md p-4 my-3 overflow-x-auto text-xs chat-code-expand">
                    {children}
                  </pre>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>

            {/* Streaming cursor */}
            {isStreaming && (
              <span className="chat-streaming-cursor" />
            )}
          </div>
        )}

        {/* HTML previews */}
        {!isUser &&
          !isStreaming &&
          htmlBlocks.map((html, i) => (
            <HtmlPreview
              key={`${message.id}-html-${i}`}
              html={html}
              conversationId={conversationId}
            />
          ))}

        {/* Action buttons (hover) */}
        {!isStreaming && (
          <div className="chat-actions absolute -top-3 right-2 flex gap-1">
            <button
              onClick={handleCopy}
              className="p-1 rounded bg-card-bg border border-border shadow-sm text-text-secondary hover:text-text-primary transition-colors"
              title="Copy"
            >
              {copyState === 'copied' ? (
                <svg className="w-3.5 h-3.5 text-success chat-copy-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            {!isUser && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 rounded bg-card-bg border border-border shadow-sm text-text-secondary hover:text-text-primary transition-colors"
                title="Regenerate"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/rahul/Desktop/Expo && npx tsc --noEmit src/components/chat/ChatMessage.tsx
```

Expected: May show error for HtmlPreview (not yet created). That's OK — will resolve in Task 10.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ChatMessage.tsx
git commit -m "feat(chat): add ChatMessage with rich markdown, KaTeX, and action buttons"
```

---

## Task 8: ChatInput Component

**Files:**
- Create: `src/components/chat/ChatInput.tsx`
- Read: `src/lib/chat-types.ts`

- [ ] **Step 1: Create ChatInput component**

Create `src/components/chat/ChatInput.tsx`:

```typescript
'use client';

import { useState, useRef, useCallback, useEffect, KeyboardEvent, DragEvent } from 'react';
import { ChatAttachment } from '@/lib/chat-types';

interface ChatInputProps {
  onSend: (content: string, attachments?: ChatAttachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 512 * 1024; // 512KB for localStorage friendliness
const ACCEPTED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'text/plain', 'text/html', 'text/css', 'text/javascript',
  'application/pdf', 'application/json',
];

function fileToAttachment(file: File): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: (reader.result as string).split(',')[1], // strip data:...;base64,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [previewFile, setPreviewFile] = useState<ChatAttachment | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; // max ~5 lines
  }, [value]);

  // Focus input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed && attachments.length === 0) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setValue('');
    setAttachments([]);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, attachments, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isStreaming) return;
        handleSend();
      }
      if (e.key === 'Escape' && isStreaming) {
        onStop();
      }
    },
    [handleSend, isStreaming, onStop]
  );

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    for (const file of fileArr) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} is too large (max 512KB)`);
        continue;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert(`${file.name} is not a supported file type`);
        continue;
      }
      const att = await fileToAttachment(file);
      setAttachments((prev) => [...prev, att]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const insertCodeBlock = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const before = value.slice(0, start);
    const after = value.slice(ta.selectionEnd);
    const insert = '```\n\n```';
    setValue(before + insert + after);
    // Position cursor inside the code block
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + 4;
      ta.focus();
    }, 0);
  }, [value]);

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const hasContent = value.trim().length > 0 || attachments.length > 0;

  return (
    <div className="px-4 pb-4 pt-2">
      {/* File attachment badges */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachments.map((att, i) => (
            <span
              key={i}
              className="chat-badge-enter inline-flex items-center gap-1 text-xs bg-sidebar border border-border rounded-md px-2 py-1 text-text-secondary"
            >
              <button
                onClick={() => setPreviewFile(att)}
                className="hover:text-text-primary transition-colors truncate max-w-[120px]"
              >
                {att.name}
              </button>
              <button
                onClick={() => removeAttachment(i)}
                className="text-text-secondary hover:text-danger transition-colors ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        className={`chat-input-wrapper flex flex-col rounded-xl border ${
          isDragOver
            ? 'border-accent bg-accent/5'
            : isFocused
            ? 'border-accent/50 shadow-sm'
            : 'border-border'
        } bg-card-bg`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
        />

        {/* Toolbar — always visible when focused or has content */}
        {(isFocused || hasContent || attachments.length > 0) && (
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-1">
              {/* Attach file */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-sidebar transition-colors"
                title="Attach file"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
              </button>
              {/* Code block */}
              <button
                onClick={insertCodeBlock}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-sidebar transition-colors"
                title="Insert code block"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </button>
            </div>

            {/* Send / Stop button */}
            {isStreaming ? (
              <button
                onClick={onStop}
                className="p-1.5 rounded-lg bg-danger text-white hover:bg-danger/90 transition-colors"
                title="Stop generation (Esc)"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!hasContent}
                className={`p-1.5 rounded-lg transition-all ${
                  hasContent
                    ? 'bg-accent text-white hover:bg-accent/90 active:scale-95'
                    : 'text-text-secondary/40 cursor-not-allowed'
                }`}
                title="Send (Enter)"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = ''; // reset for re-upload
        }}
      />

      {/* File preview modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-card-bg border border-border rounded-xl max-w-lg w-full max-h-[70vh] overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-primary truncate">
                {previewFile.name}
              </span>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-text-secondary hover:text-text-primary"
              >
                ×
              </button>
            </div>
            {previewFile.type.startsWith('image/') ? (
              <img
                src={`data:${previewFile.type};base64,${previewFile.data}`}
                alt={previewFile.name}
                className="max-w-full rounded-lg"
              />
            ) : (
              <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap bg-code-bg rounded-lg p-3">
                {atob(previewFile.data).slice(0, 5000)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/rahul/Desktop/Expo && npx tsc --noEmit src/components/chat/ChatInput.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ChatInput.tsx
git commit -m "feat(chat): add ChatInput with auto-expand, file attachments, and toolbar"
```

---

## Task 9: ChatSidebar Component

**Files:**
- Create: `src/components/chat/ChatSidebar.tsx`
- Read: `src/lib/chat-context.tsx`

- [ ] **Step 1: Create ChatSidebar component**

Create `src/components/chat/ChatSidebar.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatContext } from '@/lib/chat-context';
import { ChatConversation } from '@/lib/chat-types';

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

interface ConversationItemProps {
  conversation: ChatConversation;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleRename = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  return (
    <div className="relative">
      <button
        onClick={onSelect}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowMenu(true);
        }}
        className={`chat-conv-item w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-accent/10 text-accent font-medium'
            : 'text-text-secondary hover:bg-sidebar hover:text-text-primary'
        }`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setEditTitle(conversation.title);
                setIsEditing(false);
              }
            }}
            className="w-full bg-transparent border-b border-accent outline-none text-sm text-text-primary"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <div className="truncate">{conversation.title}</div>
            <div className="text-xs text-text-secondary/60 mt-0.5">
              {relativeTime(conversation.lastOpenedAt)}
            </div>
          </>
        )}

        {/* Three-dot menu trigger */}
        {!isEditing && (
          <div
            className="chat-actions absolute right-2 top-2.5"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <span className="p-1 rounded hover:bg-border/50 text-text-secondary cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </span>
          </div>
        )}
      </button>

      {/* Context menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 z-20 bg-card-bg border border-border rounded-lg shadow-lg py-1 min-w-[120px] animate-fade-in"
        >
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-sidebar hover:text-text-primary transition-colors"
            onClick={() => {
              setShowMenu(false);
              setEditTitle(conversation.title);
              setIsEditing(true);
            }}
          >
            Rename
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition-colors"
            onClick={() => {
              setShowMenu(false);
              setShowDeleteConfirm(true);
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-card-bg border border-border rounded-lg shadow-lg p-3 min-w-[180px] animate-fade-in">
          <p className="text-xs text-text-secondary mb-2">Delete this conversation?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 text-xs px-2 py-1 rounded border border-border text-text-secondary hover:bg-sidebar transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete();
              }}
              className="flex-1 text-xs px-2 py-1 rounded bg-danger text-white hover:bg-danger/90 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ChatSidebarProps {
  isMobileOverlay?: boolean;
  onClose?: () => void;
}

export function ChatSidebar({ isMobileOverlay, onClose }: ChatSidebarProps) {
  const {
    conversations,
    activeConversationId,
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
  } = useChatContext();

  const sortedConversations = [...conversations].sort(
    (a, b) => b.lastOpenedAt - a.lastOpenedAt
  );

  const handleSelect = useCallback(
    (id: string) => {
      switchConversation(id);
      if (isMobileOverlay && onClose) onClose();
    },
    [switchConversation, isMobileOverlay, onClose]
  );

  const handleNew = useCallback(() => {
    createConversation();
    if (isMobileOverlay && onClose) onClose();
  }, [createConversation, isMobileOverlay, onClose]);

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        {isMobileOverlay && (
          <button
            onClick={onClose}
            className="p-1 -ml-1 text-text-secondary hover:text-text-primary"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <span className="text-sm font-semibold text-text-primary">Chats</span>
        <button
          onClick={handleNew}
          className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-sidebar transition-colors"
          title="New chat"
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-xs text-text-secondary/60">
              Your conversations will appear here.
            </p>
          </div>
        ) : (
          sortedConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              onSelect={() => handleSelect(conv.id)}
              onRename={(title) => renameConversation(conv.id, title)}
              onDelete={() => deleteConversation(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );

  if (isMobileOverlay) {
    return (
      <div className="fixed inset-0 z-40">
        <div
          className="absolute inset-0 bg-black/20"
          onClick={onClose}
        />
        <div className="absolute inset-y-0 left-0 w-72 bg-background border-r border-border animate-slide-in-right"
          style={{ animationDirection: 'reverse', transformOrigin: 'left' }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 border-r border-border bg-sidebar flex-shrink-0 hidden md:flex flex-col">
      {content}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/rahul/Desktop/Expo && npx tsc --noEmit src/components/chat/ChatSidebar.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ChatSidebar.tsx
git commit -m "feat(chat): add ChatSidebar with conversation list, rename, delete"
```

---

## Task 10: HtmlPreview Component

**Files:**
- Create: `src/components/chat/HtmlPreview.tsx`

- [ ] **Step 1: Create HtmlPreview component**

Create `src/components/chat/HtmlPreview.tsx`:

```typescript
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface HtmlPreviewProps {
  html: string;
  conversationId: string;
}

type Viewport = 'desktop' | 'tablet' | 'mobile';
const VIEWPORT_WIDTHS: Record<Viewport, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

export function HtmlPreview({ html, conversationId }: HtmlPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedHtml, setEditedHtml] = useState(html);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const expandedIframeRef = useRef<HTMLIFrameElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Update edited HTML when source changes
  useEffect(() => {
    setEditedHtml(html);
  }, [html]);

  const getIframeContent = useCallback(
    (source: string, addHighlightScript: boolean) => {
      const highlightScript = addHighlightScript
        ? `<script>
          document.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Remove previous highlights
            document.querySelectorAll('[data-highlight]').forEach(el => {
              el.style.outline = '';
              el.removeAttribute('data-highlight');
            });
            // Highlight clicked element
            e.target.style.outline = '2px dashed #2383E2';
            e.target.setAttribute('data-highlight', 'true');
            // Send info to parent
            const tag = e.target.tagName.toLowerCase();
            const cls = e.target.className ? '.' + e.target.className.split(' ').join('.') : '';
            const id = e.target.id ? '#' + e.target.id : '';
            window.parent.postMessage({
              type: 'element-selected',
              selector: tag + id + cls,
              text: e.target.textContent?.slice(0, 50) || '',
            }, '*');
          }, true);
        <\/script>`
        : '';
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${source}${highlightScript}</body></html>`;
    },
    []
  );

  // Listen for element selection from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'element-selected') {
        setHighlightedElement(
          `${e.data.selector}${e.data.text ? ` ("${e.data.text}")` : ''}`
        );
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const writeToIframe = useCallback(
    (iframe: HTMLIFrameElement | null, source: string, enableHighlight: boolean) => {
      if (!iframe) return;
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.open();
      doc.write(getIframeContent(source, enableHighlight));
      doc.close();
    },
    [getIframeContent]
  );

  // Write HTML to inline iframe
  useEffect(() => {
    writeToIframe(iframeRef.current, editedHtml, false);
  }, [editedHtml, writeToIframe]);

  // Write HTML to expanded iframe
  useEffect(() => {
    if (isExpanded) {
      writeToIframe(expandedIframeRef.current, editedHtml, true);
    }
  }, [isExpanded, editedHtml, viewport, writeToIframe]);

  // Live update preview from editor
  useEffect(() => {
    if (!isEditing) return;
    const timer = setTimeout(() => {
      writeToIframe(expandedIframeRef.current, editedHtml, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [editedHtml, isEditing, writeToIframe]);

  return (
    <>
      {/* Inline thumbnail */}
      <div className="relative mt-3 rounded-lg border border-border overflow-hidden group/preview">
        <iframe
          ref={iframeRef}
          className="w-full h-[300px] bg-white pointer-events-none"
          sandbox="allow-scripts allow-same-origin"
          title="HTML Preview"
        />
        <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/5 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover/preview:opacity-100">
          <button
            onClick={() => setIsExpanded(true)}
            className="px-3 py-1.5 text-xs font-medium bg-card-bg border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            Expand
          </button>
          <button
            onClick={() => {
              setIsExpanded(true);
              setIsEditing(true);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-card-bg border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Full-screen modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col animate-fade-in">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-card-bg border-b border-border">
            <div className="flex items-center gap-2">
              {/* Viewport switcher */}
              {(['desktop', 'tablet', 'mobile'] as Viewport[]).map((vp) => (
                <button
                  key={vp}
                  onClick={() => setViewport(vp)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    viewport === vp
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:bg-sidebar'
                  }`}
                >
                  {vp.charAt(0).toUpperCase() + vp.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  isEditing
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:bg-sidebar border border-border'
                }`}
              >
                {isEditing ? 'Preview Only' : 'Edit Code'}
              </button>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(editedHtml);
                }}
                className="px-2.5 py-1 text-xs rounded-md text-text-secondary hover:bg-sidebar border border-border transition-colors"
              >
                Copy HTML
              </button>
              <button
                onClick={() => {
                  setIsExpanded(false);
                  setIsEditing(false);
                  setHighlightedElement(null);
                }}
                className="p-1 text-text-secondary hover:text-text-primary"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Code editor (when editing) */}
            {isEditing && (
              <div className="w-1/2 flex flex-col border-r border-border bg-code-bg">
                <textarea
                  ref={editorRef}
                  value={editedHtml}
                  onChange={(e) => setEditedHtml(e.target.value)}
                  className="flex-1 p-4 font-mono text-xs bg-transparent text-text-primary resize-none focus:outline-none leading-relaxed"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Preview iframe */}
            <div className={`${isEditing ? 'w-1/2' : 'flex-1'} flex items-start justify-center overflow-auto bg-[#f0f0f0] dark:bg-[#1a1a1a] p-4`}>
              <div
                style={{
                  width: isEditing ? '100%' : VIEWPORT_WIDTHS[viewport],
                  maxWidth: '100%',
                  transition: 'width 300ms ease',
                }}
              >
                <iframe
                  ref={expandedIframeRef}
                  className="w-full bg-white rounded-lg shadow-lg"
                  style={{ minHeight: '80vh' }}
                  sandbox="allow-scripts allow-same-origin"
                  title="HTML Preview Expanded"
                />
              </div>
            </div>
          </div>

          {/* Refine bar (when element is highlighted) */}
          {highlightedElement && (
            <div className="flex items-center gap-3 px-4 py-2 bg-card-bg border-t border-border">
              <span className="text-xs text-text-secondary truncate flex-1">
                Selected: <code className="text-accent">{highlightedElement}</code>
              </span>
              <button
                onClick={() => {
                  // This will be handled by the parent ChatArea through a callback
                  const event = new CustomEvent('chat-refine-element', {
                    detail: { selector: highlightedElement, html: editedHtml },
                  });
                  window.dispatchEvent(event);
                  setIsExpanded(false);
                  setHighlightedElement(null);
                }}
                className="px-3 py-1 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                Refine this
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/rahul/Desktop/Expo && npx tsc --noEmit src/components/chat/HtmlPreview.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/HtmlPreview.tsx
git commit -m "feat(chat): add HtmlPreview with inline thumbnail, CodePen editor, click-to-highlight"
```

---

## Task 11: ChatArea Component

**Files:**
- Create: `src/components/chat/ChatArea.tsx`
- Read: `src/lib/chat-context.tsx`
- Read: `src/lib/ai/client.ts`

- [ ] **Step 1: Create ChatArea component**

Create `src/components/chat/ChatArea.tsx`:

```typescript
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useChatContext } from '@/lib/chat-context';
import { useGenerationContext } from '@/lib/generation-context';
import { useToast } from '@/components/ui/Toast';
import { streamCompletion } from '@/lib/ai/client';
import {
  CHAT_SYSTEM_PROMPT,
  CHAT_WINDOW_SIZE,
  ChatMessage as ChatMessageType,
} from '@/lib/chat-types';
import {
  getSummary,
  saveSummary,
  addMessage,
  getConversationById,
} from '@/lib/chat-storage';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ScrollFAB } from './ScrollFAB';

export function ChatArea() {
  const {
    activeConversation,
    activeConversationId,
    isStreaming,
    setIsStreaming,
    addUserMessage,
    addAssistantMessage,
    updateStreamingMessage,
    regenerateLastResponse,
    createConversation,
    refreshConversations,
  } = useChatContext();
  const { setIsGenerating } = useGenerationContext();
  const { showToast } = useToast();

  const [streamingContent, setStreamingContent] = useState('');
  const [streamingThinking, setStreamingThinking] = useState('');
  const [showFAB, setShowFAB] = useState(false);
  const [crossfading, setCrossfading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const userScrolledRef = useRef(false);
  const prevConvIdRef = useRef<string | null>(null);

  const [storageWarning, setStorageWarning] = useState(false);

  const messages = activeConversation?.messages ?? [];

  // Check storage usage on mount and after sends
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const total = Object.keys(localStorage).reduce(
      (sum, key) => sum + (localStorage.getItem(key)?.length ?? 0) * 2,
      0
    );
    setStorageWarning(total / (5 * 1024 * 1024) >= 0.8);
  }, [messages.length]);

  // Crossfade on conversation switch
  useEffect(() => {
    if (prevConvIdRef.current && prevConvIdRef.current !== activeConversationId) {
      setCrossfading(true);
      setTimeout(() => setCrossfading(false), 150);
    }
    prevConvIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (!userScrolledRef.current && (isStreaming || messages.length > 0)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingContent, messages.length, isStreaming]);

  // Detect user scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    userScrolledRef.current = distanceFromBottom > 100;
    setShowFAB(distanceFromBottom > 100);
  }, []);

  const scrollToBottom = useCallback(() => {
    userScrolledRef.current = false;
    setShowFAB(false);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Build messages for API with sliding window + summary
  const buildApiMessages = useCallback(
    (conversationMessages: ChatMessageType[]) => {
      const apiMessages: { role: 'user' | 'system' | 'assistant'; content: string }[] = [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
      ];

      if (conversationMessages.length <= CHAT_WINDOW_SIZE) {
        // All messages fit in window
        for (const msg of conversationMessages) {
          apiMessages.push({ role: msg.role, content: msg.content });
        }
      } else {
        // Need windowing
        const convId = activeConversationId!;
        const cached = getSummary(convId);
        const windowStart = conversationMessages.length - CHAT_WINDOW_SIZE;

        if (cached && cached.summarizedUpTo >= windowStart) {
          // Cached summary covers enough
          apiMessages.push({
            role: 'system',
            content: `Previous conversation summary: ${cached.summary}`,
          });
        } else {
          // Need to generate summary in background (for now, use truncation)
          // The background summarize will be triggered after this call
          const oldMessages = conversationMessages.slice(0, windowStart);
          const quickSummary = oldMessages
            .map((m) => `${m.role}: ${m.content.slice(0, 100)}`)
            .join('\n');
          apiMessages.push({
            role: 'system',
            content: `Previous conversation context (truncated): ${quickSummary.slice(0, 500)}`,
          });

          // Trigger background summarization
          triggerBackgroundSummary(
            convId,
            oldMessages,
            cached?.summarizedUpTo ?? 0,
            windowStart
          );
        }

        // Add recent messages
        for (const msg of conversationMessages.slice(windowStart)) {
          apiMessages.push({ role: msg.role, content: msg.content });
        }
      }

      return apiMessages;
    },
    [activeConversationId]
  );

  // Background summarization
  const triggerBackgroundSummary = useCallback(
    async (
      convId: string,
      oldMessages: ChatMessageType[],
      existingSummarizedUpTo: number,
      newSummarizedUpTo: number
    ) => {
      // Only summarize messages not yet summarized
      const toSummarize = oldMessages.slice(existingSummarizedUpTo);
      if (toSummarize.length === 0) return;

      const cached = getSummary(convId);
      const previousSummary = cached?.summary || '';

      const summaryPrompt = previousSummary
        ? `Here is the previous summary of an earlier part of the conversation:\n${previousSummary}\n\nNow summarize these additional messages, incorporating the previous summary into a unified summary (max 200 words):\n${toSummarize.map((m) => `${m.role}: ${m.content}`).join('\n')}`
        : `Summarize this conversation concisely (max 200 words), preserving key topics, decisions, and context:\n${toSummarize.map((m) => `${m.role}: ${m.content}`).join('\n')}`;

      try {
        const summary = await streamCompletion(
          'minimax',
          [
            { role: 'system', content: 'You are a conversation summarizer. Be concise.' },
            { role: 'user', content: summaryPrompt },
          ],
          () => {} // no streaming needed, just collect
        );
        saveSummary(convId, summary, newSummarizedUpTo);
      } catch {
        // Silent fail — summarization is best-effort
      }
    },
    []
  );

  // Send message
  const handleSend = useCallback(
    async (content: string, attachments?: ChatMessageType['attachments']) => {
      let convId = activeConversationId;

      // Create new conversation if none active
      if (!convId) {
        const conv = createConversation();
        convId = conv.id;
      }

      addUserMessage(content, attachments);

      // Get updated conversation
      const conv = getConversationById(convId);
      if (!conv) return;

      // Add placeholder assistant message
      addAssistantMessage('', undefined);

      setIsStreaming(true);
      setIsGenerating(true);
      setStreamingContent('');
      setStreamingThinking('');
      userScrolledRef.current = false;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const apiMessages = buildApiMessages(conv.messages);
        let content = '';
        let thinking = '';

        await streamCompletion(
          'minimax',
          apiMessages,
          (chunk) => {
            if (chunk.thinking) {
              thinking += chunk.thinking;
              setStreamingThinking(thinking);
            }
            if (chunk.delta) {
              content += chunk.delta;
              setStreamingContent(content);
            }
            // Persist periodically (every ~20 chunks)
            updateStreamingMessage(content, thinking || undefined);
          },
          controller.signal
        );

        // Final save
        updateStreamingMessage(content, thinking || undefined);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (msg !== 'Generation cancelled') {
          updateStreamingMessage(
            `\n\n> **Error:** ${msg}\n> \n> [Click Regenerate to retry]`,
            undefined
          );
          showToast('Failed to get response', 'error');
        }
      } finally {
        setIsStreaming(false);
        setIsGenerating(false);
        setStreamingContent('');
        setStreamingThinking('');
        abortControllerRef.current = null;
        refreshConversations();
      }
    },
    [
      activeConversationId,
      addUserMessage,
      addAssistantMessage,
      updateStreamingMessage,
      setIsStreaming,
      setIsGenerating,
      buildApiMessages,
      showToast,
      createConversation,
      refreshConversations,
    ]
  );

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleRegenerate = useCallback(async () => {
    const trimmed = regenerateLastResponse();
    if (!trimmed || trimmed.length === 0) return;
    const lastUserMsg = trimmed[trimmed.length - 1];
    if (lastUserMsg.role !== 'user') return;
    await handleSend(lastUserMsg.content, lastUserMsg.attachments);
  }, [regenerateLastResponse, handleSend]);

  // Listen for refine-element events from HtmlPreview
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.selector) {
        const input = document.querySelector(
          '.chat-input-textarea'
        ) as HTMLTextAreaElement;
        if (input) {
          input.value = `Update the element ${detail.selector} in the HTML above: `;
          input.focus();
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };
    window.addEventListener('chat-refine-element', handler);
    return () => window.removeEventListener('chat-refine-element', handler);
  }, []);

  // Welcome screen
  if (!activeConversation || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-medium text-text-primary mb-1 animate-fade-in">
              What can I help you with?
            </h2>
            <p className="text-sm text-text-secondary/60 animate-fade-in" style={{ animationDelay: '100ms' }}>
              Start a conversation below
            </p>
          </div>
        </div>
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Storage warning banner */}
      {storageWarning && (
        <div className="flex items-center justify-between px-4 py-2 bg-warning/10 border-b border-warning/20 text-xs text-warning">
          <span>Storage is getting full. Oldest conversations may be removed.</span>
          <button onClick={() => setStorageWarning(false)} className="ml-2 hover:text-text-primary">×</button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        <div
          className={`max-w-[700px] mx-auto px-4 py-6 space-y-4 ${
            crossfading ? 'chat-crossfade-in' : ''
          }`}
        >
          {messages.map((msg, i) => {
            const isLastAssistant =
              msg.role === 'assistant' && i === messages.length - 1;
            const isCurrentlyStreaming = isStreaming && isLastAssistant;

            return (
              <div
                key={msg.id}
                className={i < 5 ? 'chat-stagger-in' : ''}
                style={i < 5 ? { animationDelay: `${i * 30}ms` } : undefined}
              >
                <ChatMessage
                  message={
                    isCurrentlyStreaming
                      ? {
                          ...msg,
                          content: streamingContent || msg.content,
                          thinking: streamingThinking || msg.thinking,
                        }
                      : msg
                  }
                  isStreaming={isCurrentlyStreaming}
                  onRegenerate={
                    !isStreaming && msg.role === 'assistant' && i === messages.length - 1
                      ? handleRegenerate
                      : undefined
                  }
                  conversationId={activeConversationId!}
                />
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll FAB */}
      <ScrollFAB visible={showFAB} onClick={scrollToBottom} />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/rahul/Desktop/Expo && npx tsc --noEmit src/components/chat/ChatArea.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ChatArea.tsx
git commit -m "feat(chat): add ChatArea with streaming, auto-scroll, context windowing"
```

---

## Task 12: Chat Page

**Files:**
- Create: `src/app/chat/page.tsx`

- [ ] **Step 1: Create the chat page**

Create `src/app/chat/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { useChatContext } from '@/lib/chat-context';

export default function ChatPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { activeConversation, createConversation } = useChatContext();

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Desktop sidebar */}
      <ChatSidebar />

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border md:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1 text-text-secondary hover:text-text-primary"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-medium text-text-primary truncate mx-4">
            {activeConversation?.title || 'New Chat'}
          </span>
          <button
            onClick={() => createConversation()}
            className="p-1 text-text-secondary hover:text-text-primary"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        <ChatArea />
      </div>

      {/* Mobile overlay sidebar */}
      {mobileMenuOpen && (
        <ChatSidebar
          isMobileOverlay
          onClose={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/rahul/Desktop/Expo && npx tsc --noEmit src/app/chat/page.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/app/chat/page.tsx
git commit -m "feat(chat): add /chat page with sidebar + chat area layout"
```

---

## Task 13: Add Chat to Navigation

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add Chat to NAV_ITEMS array**

In `src/components/Sidebar.tsx`, find the `NAV_ITEMS` array and add the Chat item between Content Library and Settings:

```typescript
const NAV_ITEMS = [
  { href: '/', label: 'Generate', icon: /* existing icon */ },
  { href: '/content', label: 'Content Library', icon: /* existing icon */ },
  {
    href: '/chat',
    label: 'Chat',
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  { href: '/settings', label: 'Settings', icon: /* existing icon */ },
];
```

Note: Read the actual file to see the exact icon function signature and replicate the pattern. The Chat icon uses a chat bubble from Heroicons.

- [ ] **Step 2: Verify the sidebar renders correctly**

```bash
cd /Users/rahul/Desktop/Expo && npm run dev
```

Open the browser, verify:
- Chat appears in sidebar between Content Library and Settings
- Chat appears in mobile bottom nav
- Clicking Chat navigates to /chat
- Active state (left border + accent color) works

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat(chat): add Chat navigation item to sidebar and mobile nav"
```

---

## Task 14: Settings Page — Storage Gauge Extension

**Files:**
- Modify: `src/app/settings/page.tsx`
- Read: `src/lib/chat-storage.ts`

- [ ] **Step 1: Add chat storage info to settings**

In `src/app/settings/page.tsx`, import and display chat storage alongside existing content storage:

```typescript
// Add import:
import { getChatStorageBytes, getAllConversations } from '@/lib/chat-storage';

// In the storage section, add after existing stats:
const chatBytes = getChatStorageBytes();
const chatConvCount = getAllConversations().length;
```

Add a line to the storage display showing:
- "Chat: X conversations (Y KB)"
- Include chat bytes in the total storage gauge calculation

- [ ] **Step 2: Verify settings page shows chat storage**

```bash
cd /Users/rahul/Desktop/Expo && npm run dev
```

Navigate to /settings, verify chat storage info appears.

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat(chat): show chat storage stats in settings page"
```

---

## Task 15: Mermaid Rendering in Chat Messages

**Files:**
- Modify: `src/components/chat/ChatMessage.tsx`

- [ ] **Step 1: Add Mermaid support to ChatMessage**

Add lazy Mermaid rendering to the ChatMessage component. In the ReactMarkdown `components` override, add Mermaid detection to the `code` component (matching the pattern in `MarkdownPreview.tsx`):

```typescript
// At top of file:
import { useEffect, useRef, useState, useCallback } from 'react';

// Inside the code component override:
code: ({ className, children, ...props }) => {
  const lang = className?.replace('language-', '');

  if (lang === 'mermaid') {
    return <MermaidBlock content={String(children).trim()} />;
  }

  const isBlock = className?.includes('language-');
  if (isBlock) {
    return <code className={className} {...props}>{children}</code>;
  }
  return (
    <code className="bg-code-bg border border-border rounded px-1.5 py-0.5 text-xs font-mono" {...props}>
      {children}
    </code>
  );
},
```

Add a MermaidBlock component inside the same file:

```typescript
function MermaidBlock({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        const isDark = document.documentElement.classList.contains('dark');
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, content);
        if (!cancelled) setSvg(renderedSvg);
      } catch (e) {
        if (!cancelled) setError('Failed to render diagram');
      }
    })();
    return () => { cancelled = true; };
  }, [content]);

  if (error) {
    return <p className="text-xs text-danger italic">{error}</p>;
  }
  if (!svg) {
    return <p className="text-xs text-text-secondary italic">Rendering diagram…</p>;
  }
  return (
    <div
      ref={containerRef}
      className="my-3 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

- [ ] **Step 2: Verify Mermaid renders in chat**

Test by sending a message like "Draw a flowchart showing login flow" and confirming the diagram renders.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ChatMessage.tsx
git commit -m "feat(chat): add lazy Mermaid diagram rendering in chat messages"
```

---

## Task 16: Integration Testing & Polish

**Files:**
- All chat components

- [ ] **Step 1: Run the full app and test end-to-end**

```bash
cd /Users/rahul/Desktop/Expo && npm run dev
```

Test checklist:
1. Navigate to /chat from sidebar — page loads with welcome screen
2. Type a message and press Enter — message sends, AI streams response
3. Response renders with live markdown (headers, code blocks, etc.)
4. Thinking block appears collapsed, click to expand
5. Create multiple conversations — sidebar shows them sorted by last-opened
6. Switch between conversations — crossfade transition
7. Rename a conversation — inline edit works
8. Delete a conversation — confirmation dialog, then removal
9. File attachment — drag-drop or click attach, badge shows, click to preview
10. Send a message requesting HTML — inline preview thumbnail appears
11. Click "Expand" on HTML preview — full-screen modal with viewport switcher
12. Click "Edit" — CodePen editor with live preview
13. Click an element in preview — highlight + "Refine this" button
14. Scroll up during streaming — auto-scroll pauses, FAB appears
15. Click FAB — scrolls to bottom
16. Press Esc during streaming — generation stops
17. Mobile view — responsive layout, hamburger opens conversation list
18. Dark mode — all chat components respect theme
19. Error handling — disconnect network, verify retry + error message

- [ ] **Step 2: Fix any issues found during testing**

Address each issue found. Common fixes:
- CSS adjustments for spacing/alignment
- Dark mode color mismatches
- Mobile layout overflows
- Scroll behavior edge cases

- [ ] **Step 3: Run production build to verify no errors**

```bash
cd /Users/rahul/Desktop/Expo && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(chat): polish and integration fixes from end-to-end testing"
```

---

## Task Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Types & Dependencies | None |
| 2 | Chat Storage Layer | Task 1 |
| 3 | Chat Context Provider | Tasks 1, 2 |
| 4 | CSS Animations | None |
| 5 | ThinkingBlock Component | Task 4 |
| 6 | ScrollFAB Component | Task 4 |
| 7 | ChatMessage Component | Tasks 1, 4, 5 |
| 8 | ChatInput Component | Task 1 |
| 9 | ChatSidebar Component | Task 3 |
| 10 | HtmlPreview Component | Task 4 |
| 11 | ChatArea Component | Tasks 3, 7, 8, 6 |
| 12 | Chat Page | Tasks 9, 11 |
| 13 | Sidebar Navigation | Task 12 |
| 14 | Settings Storage Gauge | Task 2 |
| 15 | Mermaid in Chat | Task 7 |
| 16 | Integration Testing | All |

**Parallelizable groups:**
- Tasks 1 + 4 (no dependencies, independent)
- Tasks 5 + 6 + 8 + 10 (all depend only on Task 4 or Task 1)
- Tasks 13 + 14 + 15 (independent polish tasks)
