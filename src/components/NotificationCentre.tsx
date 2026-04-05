'use client';
import { useState } from 'react';
import { useNotifications } from '@/components/ui/Toast';

export function NotificationCentre({ collapsed, isMobile }: { collapsed?: boolean; isMobile?: boolean }) {
  const { notifications, unreadCount, markAllRead, clearAll, markRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const relativeTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <>
      {isMobile ? (
        <button
          onClick={(e) => { e.preventDefault(); setOpen(true); }}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 flex-1 min-w-0 ${
            open ? 'text-accent' : 'text-text-secondary'
          }`}
        >
          <div className="relative w-5 h-5 flex justify-center items-center">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
             {unreadCount > 0 && (
               <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-background" />
             )}
          </div>
          <span className="text-[10px] truncate">Alerts</span>
        </button>
      ) : (
        <button
          onClick={(e) => { e.preventDefault(); setOpen(true); }}
          className={`flex items-center w-full h-11 text-sm transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : 'px-4 gap-3'
          } ${
            open
              ? 'bg-accent/10 text-accent font-medium'
              : 'text-text-secondary hover:bg-border/70 hover:text-text-primary'
          }`}
          title={collapsed ? 'Notifications' : undefined}
        >
          <div className="relative shrink-0 flex items-center justify-center w-4 h-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
          {!collapsed && <span className="flex-1 text-left truncate">Notifications</span>}
          {!collapsed && unreadCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Slide-in panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div
            className="fixed right-0 top-0 bottom-0 w-80 glass-panel z-50 flex flex-col animate-slide-in-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <h2 className="type-section-label">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-accent text-white text-[10px] font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={markAllRead} className="text-xs text-accent hover:underline">Mark all read</button>
                <button onClick={clearAll} className="text-xs text-text-secondary hover:text-text-primary">Clear</button>
                <button onClick={() => setOpen(false)} className="text-text-secondary hover:text-text-primary ml-2">✕</button>
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <span className="text-3xl mb-3">🔔</span>
                  <p className="text-sm text-text-secondary">No notifications yet</p>
                  <p className="text-xs text-text-secondary mt-1">We&apos;ll let you know when content is ready</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`w-full text-left px-5 py-4 hover:bg-sidebar/50 transition-colors ${!n.read ? 'bg-accent/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-sm">
                          {n.type === 'success' ? '✓' : n.type === 'error' ? '✗' : 'ℹ'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary leading-snug">{n.message}</p>
                          <p className="text-xs text-text-secondary mt-1">{relativeTime(n.timestamp)}</p>
                        </div>
                        {!n.read && <span className="w-2 h-2 bg-accent rounded-full shrink-0 mt-1.5" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
