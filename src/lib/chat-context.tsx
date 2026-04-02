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
    attachments?: ChatMessage['attachments'],
    overrideConvId?: string
  ) => ChatMessage;
  addAssistantMessage: (content: string, thinking?: string, overrideConvId?: string) => ChatMessage;
  updateStreamingMessage: (content: string, thinking?: string) => void;
  regenerateLastResponse: () => ChatMessage[] | null;
  refreshConversations: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    if (typeof window === 'undefined') return [];
    return getAllConversations();
  });
  const [activeConversationId, setActiveId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const convs = getAllConversations();
    const activeId = getActiveConversationId();
    if (activeId && convs.some((c) => c.id === activeId)) return activeId;
    if (convs.length > 0) {
      setActiveConversationId(convs[0].id);
      return convs[0].id;
    }
    return null;
  });
  const [isStreaming, setIsStreaming] = useState(false);

  const refreshConversations = useCallback(() => {
    setConversations(getAllConversations());
  }, []);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;

  const createConversation = useCallback(() => {
    autoCleanupIfNeeded(activeConversationId);
    const conv = storageCreateConversation();
    setActiveId(conv.id);
    setActiveConversationId(conv.id);
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
    (content: string, attachments?: ChatMessage['attachments'], overrideConvId?: string) => {
      const convId = overrideConvId || activeConversationId;
      if (!convId) throw new Error('No active conversation');
      const msg = storageAddMessage(convId, {
        role: 'user',
        content,
        attachments,
      });
      // Auto-title on first user message
      const conv = getConversationById(convId);
      if (conv && conv.messages.filter((m) => m.role === 'user').length === 1) {
        storageRenameConversation(convId, generateTitle(content));
      }
      refreshConversations();
      return msg;
    },
    [activeConversationId, refreshConversations]
  );

  const addAssistantMessage = useCallback(
    (content: string, thinking?: string, overrideConvId?: string) => {
      const convId = overrideConvId || activeConversationId;
      if (!convId) throw new Error('No active conversation');
      const msg = storageAddMessage(convId, {
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
      // Only persist to localStorage — do NOT refresh React state on every chunk.
      // ChatArea uses its own streamingContent/streamingThinking state for live display.
      // This avoids re-parsing all conversations from localStorage on every token.
      storageUpdateLastAssistant(activeConversationId, content, thinking);
    },
    [activeConversationId]
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
