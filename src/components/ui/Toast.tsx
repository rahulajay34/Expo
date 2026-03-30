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

// ─── Individual Toast ────────────────────────────────────────────────────────

const DOT_COLORS: Record<ToastType, string> = {
  success: 'bg-[#3DAF4B]',
  error: 'bg-[#DC2626]',
  info: 'bg-[#787774]',
};

function Toast({ item }: { item: ToastItem }) {
  return (
    <div
      className="toast-enter flex items-center gap-3 bg-white rounded-lg shadow-lg border border-[#E8E8E8] px-4 py-3 text-sm text-[#37352F] min-w-[220px] max-w-xs"
      role="alert"
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${DOT_COLORS[item.type]}`}
      />
      <span className="flex-1 leading-snug">{item.message}</span>
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
  // Keep a map of timers so we can clear them on unmount
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const unreadCount = notifications.filter(n => !n.read).length;

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

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
      const item: ToastItem = { id, message, type };

      setToasts((prev) => {
        // Keep only last MAX_VISIBLE - 1 so the new one fits
        const trimmed = prev.slice(-(MAX_VISIBLE - 1));
        return [...trimmed, item];
      });

      timers.current[id] = setTimeout(() => dismiss(id), 3000);

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
          <Toast key={item.id} item={item} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
