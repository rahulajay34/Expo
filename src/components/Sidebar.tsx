'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useGenerationContext } from '@/lib/generation-context';
import { useTheme } from '@/lib/theme-context';
import { AnimatedSVG } from '@/components/ui/AnimatedSVG';
import { NotificationCentre } from '@/components/NotificationCentre';
import { Modal } from '@/components/ui/Modal';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { Button } from '@/components/ui/Button';
import { springSnappy, reducedMotionTransition } from '@/lib/motion';
import { TokenVelocityPulse } from '@/components/TokenVelocityPulse';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Generate',
    icon: (
      <AnimatedSVG className="w-4 h-4">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </AnimatedSVG>
    ),
  },
  {
    href: '/content',
    label: 'Content Library',
    icon: (
      <AnimatedSVG className="w-4 h-4">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </AnimatedSVG>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <AnimatedSVG className="w-4 h-4">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </AnimatedSVG>
    ),
  },
];

function normalizeActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '';
  return pathname.startsWith(href);
}

/* ── Mobile Bottom Nav (rendered outside <aside>) ── */
export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isGenerating, isDirty, velocityBand } = useGenerationContext();
  const [navModal, setNavModal] = useState<{ show: boolean; path: string }>({ show: false, path: '' });

  function handleNav(e: React.MouseEvent, href: string) {
    e.preventDefault();
    if (isGenerating || isDirty) {
      setNavModal({ show: true, path: href });
      return;
    }
    router.push(href);
  }

  function confirmNav() {
    router.push(navModal.path);
    setNavModal({ show: false, path: '' });
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-border bg-background/80 backdrop-blur-lg dark:bg-[rgba(25,25,25,0.85)] dark:border-t-[rgba(255,255,255,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-14">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const isActive = normalizeActive(href, pathname);
            const showActivityDot = href === '/' && isGenerating;
            return (
              <a
                key={href}
                href={href}
                onClick={(e) => { e.preventDefault(); handleNav(e, href); }}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 flex-1 min-w-0 min-h-[44px] transition-transform active:scale-90',
                  isActive ? 'text-accent' : 'text-text-secondary'
                )}
                style={{ touchAction: 'manipulation' }}
                aria-label={label}
              >
                <span className={cn('w-5 h-5 transition-transform relative', isActive && 'scale-110')}>
                  {icon}
                  {showActivityDot && (
                    <span className="absolute -top-0.5 -right-0.5">
                      <TokenVelocityPulse band={velocityBand} active={isGenerating} size={5} />
                    </span>
                  )}
                </span>
                <span className={cn('text-[10px] truncate', isActive && 'font-semibold')}>{label}</span>
                {isActive && (
                  <motion.span
                    layoutId="mobileNavActiveIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-accent"
                    transition={springSnappy}
                  />
                )}
              </a>
            );
          })}
          <NotificationCentre isMobile />
        </div>
      </nav>

      {/* Navigation confirmation modal (mobile) */}
      <Modal
        isOpen={navModal.show}
        onClose={() => setNavModal({ show: false, path: '' })}
        title={isGenerating ? 'Generation in progress' : 'Unsaved changes'}
      >
        <p className="text-sm text-text-secondary mb-6">
          {isGenerating
            ? 'Content is still generating. If you leave now, the generation will be lost.'
            : 'You have unsaved changes. If you leave now, your edits will be lost.'}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setNavModal({ show: false, path: '' })}>
            Stay
          </Button>
          <Button variant="danger" onClick={confirmNav}>
            Leave anyway
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isGenerating, isDirty, velocityBand } = useGenerationContext();
  const { theme, setTheme } = useTheme();
  const [navModal, setNavModal] = useState<{ show: boolean; path: string }>({ show: false, path: '' });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const sidebarTransition = prefersReducedMotion ? reducedMotionTransition : springSnappy;

  const cycleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  }, [theme, setTheme]);

  // S-035: Prefetch high-priority routes on mount for faster navigation
  useEffect(() => {
    router.prefetch('/content');
    router.prefetch('/settings');
  }, [router]);

  // Keyboard shortcut: ? toggles shortcuts modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function handleNav(e: React.MouseEvent, href: string) {
    e.preventDefault();
    if (isGenerating || isDirty) {
      setNavModal({ show: true, path: href });
      return;
    }
    router.push(href);
  }

  function confirmNav() {
    router.push(navModal.path);
    setNavModal({ show: false, path: '' });
  }

  return (
    <motion.aside
      className={cn(
        'h-screen bg-sidebar border-r border-border flex flex-col shrink-0',
        'hidden md:flex',
        'dark:border-r-[rgba(255,255,255,0.06)]',
      )}
      animate={{ width: collapsed ? 56 : 240 }}
      transition={sidebarTransition}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 border-b border-border shrink-0 overflow-hidden',
        collapsed ? 'px-4 justify-center' : 'px-5'
      )}>
        <Link
          href="/"
          aria-label="S13N — go to home"
          className="flex items-center gap-2.5 min-w-0 rounded-md hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <svg
            width={collapsed ? 28 : 32}
            height={collapsed ? 28 : 32}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
            aria-hidden="true"
            style={{ transition: 'width 0.2s, height 0.2s' }}
          >
            {/* Back layer */}
            <rect x="7" y="4" width="20" height="15" rx="2.5" fill="var(--accent)" opacity="0.2" />
            {/* Middle layer */}
            <rect x="5" y="8" width="20" height="15" rx="2.5" fill="var(--accent)" opacity="0.45" />
            {/* Top layer */}
            <rect x="3" y="12" width="20" height="15" rx="2.5" fill="var(--accent)" />
            {/* Lines on top layer */}
            <line x1="7" y1="17.5" x2="16" y2="17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
            <line x1="7" y1="21.5" x2="19" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          </svg>
          {!collapsed && (
            <motion.div
              className="min-w-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.15 }}
            >
              <div className="leading-tight truncate" style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '0.02em', color: 'var(--text-primary)' }}>S13N</div>
              <div className="leading-tight" style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)' }}>Content Authoring</div>
            </motion.div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {!collapsed && (
          <motion.div
            className="px-5 pt-1 pb-2 text-[10px] uppercase tracking-widest text-text-secondary/50 select-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.15 }}
          >
            Navigation
          </motion.div>
        )}
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = normalizeActive(href, pathname);
          const showActivityDot = href === '/' && isGenerating;
          return (
            <motion.a
              key={href}
              href={href}
              onClick={(e) => { handleNav(e, href); }}
              className={cn(
                'flex items-center h-9 mx-2 mb-0.5 rounded-md text-sm cursor-pointer relative overflow-hidden',
                collapsed ? 'px-0 justify-center' : 'px-3 gap-3',
                isActive
                  ? 'bg-accent/10 text-accent font-medium dark:bg-[rgba(255,255,255,0.06)] dark:border-l-0'
                  : 'text-text-secondary hover:bg-border/70 hover:text-text-primary dark:hover:bg-[rgba(255,255,255,0.04)]'
              )}
              title={collapsed ? label : undefined}
              aria-label={label}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
              transition={sidebarTransition}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebarActiveIndicator"
                  aria-hidden
                  className="absolute left-0 inset-y-1.5 w-[3px] rounded-r-full bg-accent"
                  transition={sidebarTransition}
                />
              )}
              <span className="shrink-0">{icon}</span>
              {!collapsed && (
                <span className="truncate flex items-center gap-1.5">
                  {label}
                  <AnimatePresence>
                    {showActivityDot && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={sidebarTransition}
                        className="inline-flex"
                      >
                        <TokenVelocityPulse band={velocityBand} active={isGenerating} size={6} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              )}
              {collapsed && showActivityDot && (
                <span className="absolute top-1 right-1">
                  <TokenVelocityPulse band={velocityBand} active={isGenerating} size={5} />
                </span>
              )}
            </motion.a>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border">
        <NotificationCentre collapsed={collapsed} />
      </div>

      {/* Tools section */}
      {!collapsed && (
        <motion.div
          className="px-5 pt-2 pb-1 text-[10px] uppercase tracking-widest text-text-secondary/50 select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.15 }}
        >
          Tools
        </motion.div>
      )}

      {/* Theme toggle (cycles light -> dark -> system) */}
      <button
        onClick={cycleTheme}
        className={cn(
          'flex items-center h-11 border-t border-border text-text-secondary hover:text-text-primary hover:bg-sidebar/80 dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors shrink-0',
          collapsed ? 'justify-center' : 'px-4 gap-3'
        )}
        title={`Theme: ${theme}`}
        aria-label={`Current theme: ${theme}. Click to cycle.`}
      >
        {theme === 'light' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : theme === 'dark' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}
        {!collapsed && <span className="text-xs text-text-secondary">{theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}</span>}
      </button>

      {/* Keyboard shortcuts button */}
      <button
        onClick={() => setShortcutsOpen(true)}
        className={cn(
          'flex items-center h-11 border-t border-border text-text-secondary hover:text-text-primary hover:bg-sidebar/80 dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors shrink-0',
          collapsed ? 'justify-center' : 'px-4 gap-3'
        )}
        title="Keyboard shortcuts"
        aria-label="Keyboard shortcuts"
      >
        <span className="text-sm font-medium shrink-0">?</span>
        {!collapsed && <span className="text-xs text-text-secondary">Shortcuts</span>}
      </button>

      {/* Be Kind — PETA India */}
      <a
        href="https://www.petaindia.com/donate/"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center h-11 border-t border-border text-text-secondary hover:text-text-primary hover:bg-sidebar/80 dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors shrink-0',
          collapsed ? 'justify-center' : 'px-4 gap-3'
        )}
        title="Be Kind — Donate to PETA India"
        aria-label="Be Kind — Donate to PETA India"
      >
        <span className="shrink-0 animate-heart-colors text-base leading-none">&#9829;</span>
        {!collapsed && <span className="text-xs text-text-secondary">Be Kind</span>}
      </a>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'flex items-center h-11 border-t border-border text-text-secondary hover:text-text-primary hover:bg-sidebar/80 dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors shrink-0',
          collapsed ? 'justify-center' : 'px-4 gap-3'
        )}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
      >
        <motion.svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={sidebarTransition}
        >
          <polyline points="15 18 9 12 15 6" />
        </motion.svg>
        {!collapsed && <span className="text-xs text-text-secondary">Collapse</span>}
      </button>

      {/* Navigation confirmation modal */}
      <Modal
        isOpen={navModal.show}
        onClose={() => setNavModal({ show: false, path: '' })}
        title={isGenerating ? 'Generation in progress' : 'Unsaved changes'}
      >
        <p className="text-sm text-text-secondary mb-6">
          {isGenerating
            ? 'Content is still generating. If you leave now, the generation will be lost.'
            : 'You have unsaved changes. If you leave now, your edits will be lost.'}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setNavModal({ show: false, path: '' })}>
            Stay
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              confirmNav();
            }}
          >
            Leave anyway
          </Button>
        </div>
      </Modal>

      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </motion.aside>
  );
}
