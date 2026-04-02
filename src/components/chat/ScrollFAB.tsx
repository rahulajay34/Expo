'use client';

interface ScrollFABProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollFAB({ visible, onClick }: ScrollFABProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="chat-fab-enter absolute bottom-20 right-4 w-9 h-9 rounded-full bg-card-bg border border-border shadow-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:shadow-lg transition-shadow"
      aria-label="Scroll to bottom"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </button>
  );
}
