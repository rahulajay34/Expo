'use client';

import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springSnappy } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface CustomSelectOption {
  value: string;
  label: string;
  preview?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const dropdownVariants = {
  hidden: { opacity: 0, scaleY: 0, transition: { duration: 0.12 } },
  visible: {
    opacity: 1,
    scaleY: 1,
    transition: springSnappy,
  },
  exit: { opacity: 0, scaleY: 0, transition: { duration: 0.12 } },
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [typeBuffer, setTypeBuffer] = useState('');
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  const instanceId = useId();
  const listboxId = `customselect-listbox-${instanceId}`;
  const optionIdPrefix = `customselect-option-${instanceId}`;

  const selectedOption = options.find((o) => o.value === value);
  const selectedIndex = options.findIndex((o) => o.value === value);

  // ── Open / Close helpers ──────────────────────────────────
  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [disabled, selectedIndex]);

  const close = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
    triggerRef.current?.focus();
  }, []);

  const selectOption = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      close();
    },
    [onChange, close],
  );

  // ── Close on outside click ────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        listboxRef.current?.contains(target)
      )
        return;
      close();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, close]);

  // ── Scroll highlighted option into view ───────────────────
  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [highlightedIndex]);

  // ── Type-ahead ────────────────────────────────────────────
  const handleTypeAhead = useCallback(
    (char: string) => {
      const newBuffer = typeBuffer + char.toLowerCase();
      setTypeBuffer(newBuffer);

      if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
      typeTimerRef.current = setTimeout(() => setTypeBuffer(''), 500);

      const matchIdx = options.findIndex((o) =>
        o.label.toLowerCase().startsWith(newBuffer),
      );
      if (matchIdx >= 0) {
        setHighlightedIndex(matchIdx);
        if (!isOpen) {
          selectOption(options[matchIdx].value);
        }
      }
    },
    [typeBuffer, options, isOpen, selectOption],
  );

  // ── Keyboard handling ─────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!isOpen) {
            open();
          } else if (highlightedIndex >= 0) {
            selectOption(options[highlightedIndex].value);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            open();
          } else {
            setHighlightedIndex((prev) =>
              prev < options.length - 1 ? prev + 1 : 0,
            );
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) {
            open();
          } else {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : options.length - 1,
            );
          }
          break;

        case 'Home':
          if (isOpen) {
            e.preventDefault();
            setHighlightedIndex(0);
          }
          break;

        case 'End':
          if (isOpen) {
            e.preventDefault();
            setHighlightedIndex(options.length - 1);
          }
          break;

        case 'Escape':
          if (isOpen) {
            e.preventDefault();
            close();
          }
          break;

        case 'Tab':
          if (isOpen) {
            close();
          }
          break;

        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            handleTypeAhead(e.key);
          }
          break;
      }
    },
    [isOpen, highlightedIndex, options, open, close, selectOption, handleTypeAhead],
  );

  return (
    <div className={cn('relative', className)}>
      {/* ── Trigger Button ─────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          isOpen && highlightedIndex >= 0
            ? `${optionIdPrefix}-${highlightedIndex}`
            : undefined
        }
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 text-sm',
          'border border-border rounded-lg bg-card-bg text-text-primary',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
          'transition-shadow duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        <span className={cn('truncate', !selectedOption && 'text-text-secondary')}>
          {selectedOption
            ? selectedOption.preview ?? selectedOption.label
            : placeholder}
        </span>

        {/* Chevron */}
        <motion.svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 ml-2 text-text-secondary"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={springSnappy}
        >
          <path d="M4 6l4 4 4-4" />
        </motion.svg>
      </button>

      {/* ── Dropdown Panel ─────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-label="Options"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ transformOrigin: 'top' }}
            className={cn(
              'absolute z-50 left-0 right-0 mt-1',
              'glass-panel rounded-lg',
              'max-h-[280px] overflow-y-auto',
              'py-1',
            )}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={option.value}
                  ref={(el) => { optionRefs.current[index] = el; }}
                  id={`${optionIdPrefix}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent trigger blur
                    selectOption(option.value);
                  }}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 text-sm cursor-pointer',
                    'transition-colors duration-75',
                    isHighlighted && 'bg-accent/10',
                    isSelected && 'text-accent font-medium',
                    !isSelected && 'text-text-primary',
                  )}
                >
                  <span className="truncate">
                    {option.preview ?? option.label}
                  </span>

                  {/* Checkmark for selected */}
                  {isSelected && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0 ml-2 text-accent"
                    >
                      <path d="M3 7.5l2.5 2.5L11 4.5" />
                    </svg>
                  )}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
