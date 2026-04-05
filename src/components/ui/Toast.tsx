'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { springSnappy } from '@/lib/motion';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  action?: ToastAction;
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
  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
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

// ─── Icons (20px inline SVGs) ────────────────────────────────────────────────

function SuccessIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
      <circle cx="10" cy="10" r="10" fill="#10B981" />
      <path d="M6 10.5L8.5 13L14 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
      <path d="M10 1.5L19 17.5H1L10 1.5Z" fill="#F59E0B" />
      <path d="M10 8V11.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="14" r="1" fill="white" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
      <circle cx="10" cy="10" r="10" fill="#EF4444" />
      <path d="M7 7L13 13M13 7L7 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
      <circle cx="10" cy="10" r="10" fill="var(--accent)" />
      <path d="M10 9V14" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="6.5" r="1" fill="white" />
    </svg>
  );
}

const TOAST_ICONS: Record<ToastType, () => React.JSX.Element> = {
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  info: InfoIcon,
};

// ─── Constants ──────────────────────────────────────────────────────────────

const PROGRESS_COLORS: Record<ToastType, string> = {
  success: 'bg-[#10B981]',
  error: 'bg-[#EF4444]',
  warning: 'bg-[#F59E0B]',
  info: 'bg-[var(--accent)]',
};

const TOAST_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  info: 4000,
  warning: 4000,
};

// Swipe-to-dismiss thresholds
const SWIPE_VELOCITY_THRESHOLD = 300; // px/s
const SWIPE_OFFSET_THRESHOLD = 100; // px

// ─── Touch Detection Hook ───────────────────────────────────────────────────

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    setIsTouch(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isTouch;
}

// ─── Reduced Motion Hook ────────────────────────────────────────────────────

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// ─── Individual Toast ────────────────────────────────────────────────────────

function ToastComponent({
  item,
  onDismiss,
  onMouseEnter,
  onMouseLeave,
  isTouchDevice,
  reducedMotion,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: (id: string) => void;
  isTouchDevice: boolean;
  reducedMotion: boolean;
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, SWIPE_OFFSET_THRESHOLD], [1, 0]);
  const Icon = TOAST_ICONS[item.type];

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (
      info.velocity.x > SWIPE_VELOCITY_THRESHOLD ||
      info.offset.x > SWIPE_OFFSET_THRESHOLD
    ) {
      onDismiss(item.id);
    }
  };

  const handleActionClick = () => {
    if (item.action) {
      item.action.onClick();
      onDismiss(item.id);
    }
  };

  return (
    <motion.div
      layout
      initial={reducedMotion ? { opacity: 1 } : { y: 20, opacity: 0, scale: 0.95 }}
      animate={reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
      exit={
        reducedMotion
          ? { opacity: 0 }
          : isTouchDevice
            ? { scale: 0.95, opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } }
            : { x: 100, opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } }
      }
      transition={reducedMotion ? { duration: 0 } : springSnappy}
      drag={isTouchDevice ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.5 }}
      onDragEnd={isTouchDevice ? handleDragEnd : undefined}
      style={isTouchDevice ? { x, opacity } : undefined}
      className="group relative flex items-center gap-3 bg-background rounded-lg shadow-lg border border-border px-4 py-3 text-sm text-text-primary min-w-[220px] max-w-xs overflow-hidden"
      role="alert"
      onMouseEnter={() => onMouseEnter(item.id)}
      onMouseLeave={() => onMouseLeave(item.id)}
    >
      <Icon />
      <span className="flex-1 leading-snug">{item.message}</span>
      {item.action && (
        <button
          onClick={handleActionClick}
          className="shrink-0 text-sm font-medium hover:underline px-1.5 py-0.5 rounded transition-colors"
          style={{ color: 'var(--accent)' }}
        >
          {item.action.label}
        </button>
      )}
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
    </motion.div>
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
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const isTouchDevice = useIsTouchDevice();
  const reducedMotion = usePrefersReducedMotion();

  const unreadCount = notifications.filter(n => !n.read).length;

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
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
    (message: string, type: ToastType = 'info', action?: ToastAction) => {
      const id = `toast-${++toastCounter}`;
      const duration = action ? Math.max(TOAST_DURATIONS[type], 6000) : TOAST_DURATIONS[type];
      const item: ToastItem = { id, message, type, duration, action };

      setToasts((prev) => {
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
        <AnimatePresence mode="popLayout" initial={false}>
          {toasts.map((item) => (
            <ToastComponent
              key={item.id}
              item={item}
              onDismiss={dismiss}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              isTouchDevice={isTouchDevice}
              reducedMotion={reducedMotion}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
