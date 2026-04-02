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
        for (const msg of conversationMessages) {
          apiMessages.push({ role: msg.role, content: msg.content });
        }
      } else {
        const convId = activeConversationId!;
        const cached = getSummary(convId);
        const windowStart = conversationMessages.length - CHAT_WINDOW_SIZE;

        if (cached && cached.summarizedUpTo >= windowStart) {
          apiMessages.push({
            role: 'system',
            content: `Previous conversation summary: ${cached.summary}`,
          });
        } else {
          const oldMessages = conversationMessages.slice(0, windowStart);
          const quickSummary = oldMessages
            .map((m) => `${m.role}: ${m.content.slice(0, 100)}`)
            .join('\n');
          apiMessages.push({
            role: 'system',
            content: `Previous conversation context (truncated): ${quickSummary.slice(0, 500)}`,
          });

          triggerBackgroundSummary(
            convId,
            oldMessages,
            cached?.summarizedUpTo ?? 0,
            windowStart
          );
        }

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
          () => {}
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

      if (!convId) {
        const conv = createConversation();
        convId = conv.id;
      }

      addUserMessage(content, attachments);

      const conv = getConversationById(convId);
      if (!conv) return;

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
            updateStreamingMessage(content, thinking || undefined);
          },
          controller.signal
        );

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
