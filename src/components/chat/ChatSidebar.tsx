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
        <div className="w-5" /> {/* spacer for alignment */}
      </div>

      {/* New Chat button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-sidebar transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Chat
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
