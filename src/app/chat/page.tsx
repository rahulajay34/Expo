'use client';

import { useState } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { useChatContext } from '@/lib/chat-context';

export default function ChatPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { activeConversation, createConversation } = useChatContext();

  return (
    <div className="flex absolute inset-0 overflow-hidden">
      {/* Desktop sidebar */}
      <ChatSidebar />

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
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
