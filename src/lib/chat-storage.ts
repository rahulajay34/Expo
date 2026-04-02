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
