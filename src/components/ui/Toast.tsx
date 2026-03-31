'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface NotificationItem {
  id: string;
  message: string;
  type: ToastType;
  timestamp: number;
  read: boolean;
  link?: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  // Notification state exposed on the same context
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
  clearAll: () => void;
  markRead: (id: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

// Alias for convenience in NotificationCentre
export { useToast as useNotifications };

// ─── Constants ──────────────────────────────────────────────────────────────

const DOT_COLORS: Record<ToastType, string> = {
  success: 'bg-[#3DAF4B]',
  error: 'bg-[#DC2626]',
  info: 'bg-[#787774]',
};

const PROGRESS_COLORS: Record<ToastType, string> = {
  success: 'bg-[#3DAF4B]',
  error: 'bg-[#DC2626]',
  info: 'bg-[#787774]',
};

const TOAST_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  info: 4000,
};

// ─── Individual Toast ────────────────────────────────────────────────────────

function Toast({
  item,
  isDismissing,
  onDismiss,
  onMouseEnter,
  onMouseLeave,
}: {
  item: ToastItem;
  isDismissing: boolean;
  onDismiss: (id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: (id: string) => void;
}) {
  return (
    <div
      className={`${isDismissing ? 'toast-exit' : 'toast-enter'} group relative flex items-center gap-3 bg-background rounded-lg shadow-lg border border-border px-4 py-3 text-sm text-text-primary min-w-[220px] max-w-xs overflow-hidden`}
      role="alert"
      onMouseEnter={() => onMouseEnter(item.id)}
      onMouseLeave={() => onMouseLeave(item.id)}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${DOT_COLORS[item.type]}`}
      />
      <span className="flex-1 leading-snug">{item.message}</span>
      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity p-0.5 -mr-1"
        aria-label="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {/* Progress bar for auto-dismiss countdown */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg overflow-hidden">
        <div
          className={`h-full ${PROGRESS_COLORS[item.type]} transition-none`}
          style={{
            animation: `toast-progress ${item.duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

const MAX_VISIBLE = 3;
const MAX_NOTIFICATIONS = 50;
let toastCounter = 0;
let notifCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  // Keep a map of timers so we can clear them on unmount
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const unreadCount = notifications.filter(n => !n.read).length;

  const dismiss = useCallback((id: string) => {
    setDismissingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      setDismissingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (timers.current[id]) {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
      }
    }, 200); // match exit animation duration
  }, []);

  const handleMouseEnter = useCallback((id: string) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const handleMouseLeave = useCallback((id: string) => {
    timers.current[id] = setTimeout(() => dismiss(id), 1500);
  }, [dismiss]);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `toast-${++toastCounter}`;
      const duration = TOAST_DURATIONS[type];
      const item: ToastItem = { id, message, type, duration };

      setToasts((prev) => {
        // Keep only last MAX_VISIBLE - 1 so the new one fits
        const trimmed = prev.slice(-(MAX_VISIBLE - 1));
        return [...trimmed, item];
      });

      timers.current[id] = setTimeout(() => dismiss(id), duration);

      // Also log to notification centre
      const notifId = `notif-${++notifCounter}`;
      const notifItem: NotificationItem = {
        id: notifId,
        message,
        type,
        timestamp: Date.now(),
        read: false,
      };
      setNotifications(prev => [notifItem, ...prev].slice(0, MAX_NOTIFICATIONS));
    },
    [dismiss]
  );

  // Clear all timers on unmount
  useEffect(() => {
    const t = timers.current;
    return () => {
      Object.values(t).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, notifications, unreadCount, markAllRead, clearAll, markRead }}>
      {children}
      {/* Portal-style fixed container — bottom-right, stacks upward */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2">
        {toasts.map((item) => (
          <Toast
            key={item.id}
            item={item}
            isDismissing={dismissingIds.has(item.id)}
            onDismiss={dismiss}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
