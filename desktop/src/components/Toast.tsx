import { useState, type JSX } from 'react';
import { useStore } from '../store';
import type { Toast } from '../types';

const ICON_MAP: Record<Toast['type'], JSX.Element> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
};

const STYLE_MAP: Record<Toast['type'], string> = {
  success: 'border-green-200 bg-green-50/95 dark:border-green-800/50 dark:bg-green-950/95',
  error: 'border-red-200 bg-red-50/95 dark:border-red-800/50 dark:bg-red-950/95',
  warning: 'border-yellow-200 bg-yellow-50/95 dark:border-yellow-800/50 dark:bg-yellow-950/95',
  info: 'border-blue-200 bg-blue-50/95 dark:border-blue-800/50 dark:bg-blue-950/95',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-200 ${
        exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0 animate-slide-up'
      } ${STYLE_MAP[toast.type]}`}
      style={{ maxWidth: '380px' }}
    >
      <span className="mt-0.5 flex-shrink-0">{ICON_MAP[toast.type]}</span>
      <span className="flex-1 text-sm font-medium text-foreground leading-snug">
        {toast.message}
      </span>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useStore();

  // Show max 3 at a time
  const visible = toasts.slice(-3);

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {visible.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
