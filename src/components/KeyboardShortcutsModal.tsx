'use client';

import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

const SHORTCUTS = [
  { key: '⌘ + Enter', description: 'Generate content (from Step 4)', context: 'Home page' },
  { key: '⌘ + S', description: 'Save content', context: 'Editor' },
  { key: 'Esc', description: 'Close popover / exit edit mode', context: 'Editor' },
  { key: '?', description: 'Show this help', context: 'Anywhere' },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <div className="space-y-1">
        {SHORTCUTS.map((s) => (
          <div
            key={s.key}
            className="flex items-center justify-between py-2 px-1 rounded hover:bg-sidebar/60 dark:hover:bg-[rgba(255,255,255,0.04)]"
          >
            <span className="text-sm text-text-secondary">{s.description}</span>
            <div className="flex items-center gap-2">
              <kbd className={cn(
                'px-2 py-0.5 rounded border text-xs font-mono font-medium',
                'bg-sidebar border-border text-text-primary'
              )}>
                {s.key}
              </kbd>
              <span className="text-xs text-text-secondary">{s.context}</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
