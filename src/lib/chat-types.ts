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
