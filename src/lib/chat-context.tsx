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
