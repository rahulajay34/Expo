'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/lib/store';
import {
  Home,
  PenTool,
  Library,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Generate', href: '/editor', icon: PenTool },
  { label: 'Library', href: '/archives', icon: Library },
  { label: 'Settings', href: '/settings', icon: Settings },
] as const;

// ---------------------------------------------------------------------------
// Theme options
// ---------------------------------------------------------------------------

const themeOptions = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
] as const;

// ---------------------------------------------------------------------------
// Sidebar Component
// ---------------------------------------------------------------------------

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const isGenerating = useAppStore((s) => s.isGenerating);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  // Track mounted state for theme hydration
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const collapsed = !sidebarOpen;

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-background',
        'hidden md:flex'
      )}
    >
      {/* ----------------------------------------------------------------- */}
      {/* Logo / Brand                                                      */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        {/* Clean black square logo mark */}
        <div className="flex h-7 w-7 items-center justify-center rounded bg-foreground text-background flex-shrink-0">
          <span className="font-display text-xs font-black">G</span>
        </div>

        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              key="brand-text"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="font-display text-base font-bold tracking-tight text-foreground"
            >
              GCCP
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Navigation Links                                                  */}
      {/* ----------------------------------------------------------------- */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 scrollbar-hidden">
        {/* Section label */}
        {!collapsed && (
          <p className="px-4 pb-1 pt-4 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Navigation
          </p>
        )}

        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          const linkContent = (
            <motion.div
              whileHover={{ x: collapsed ? 0 : 2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* Amber left indicator for active items */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
              )}

              <item.icon
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />

              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    key={`label-${item.label}`}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Generating badge next to "Generate" */}
              {item.label === 'Generate' && isGenerating && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    'relative flex h-2 w-2 shrink-0',
                    collapsed ? 'absolute right-1 top-1' : 'ml-auto'
                  )}
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </motion.span>
              )}
            </motion.div>
          );

          // When collapsed, wrap in a tooltip
          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href} aria-label={item.label}>
                    {linkContent}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link key={item.href} href={item.href} aria-label={item.label}>
              {linkContent}
            </Link>
          );
        })}
      </nav>

      {/* ----------------------------------------------------------------- */}
      {/* Bottom Section: User + Theme Toggle                               */}
      {/* ----------------------------------------------------------------- */}
      <div className="border-t border-border p-2">
        {/* Preferences section label */}
        {!collapsed && (
          <p className="px-4 pb-1 pt-4 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Preferences
          </p>
        )}

        {/* Theme toggle */}
        {mounted && (
          <div
            className={cn(
              'mb-2 flex items-center rounded-lg',
              collapsed ? 'flex-col gap-1' : 'gap-1 px-1'
            )}
          >
            {themeOptions.map((opt) => {
              const isActiveTheme = theme === opt.value;

              const themeBtn = (
                <Button
                  key={opt.value}
                  variant="ghost"
                  size={collapsed ? 'icon-xs' : 'icon-sm'}
                  onClick={() => setTheme(opt.value)}
                  aria-label={`Switch to ${opt.label} mode`}
                  className={cn(
                    'relative transition-colors',
                    isActiveTheme
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  {isActiveTheme && (
                    <motion.div
                      layoutId="theme-indicator"
                      className="absolute inset-0 rounded-md bg-muted"
                      style={{ zIndex: -1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 30,
                      }}
                    />
                  )}
                </Button>
              );

              if (collapsed) {
                return (
                  <Tooltip key={opt.value}>
                    <TooltipTrigger asChild>{themeBtn}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {opt.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return themeBtn;
            })}

            {/* Label shown when expanded */}
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  key="theme-label"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ml-auto text-[11px] text-muted-foreground"
                >
                  Theme
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Simplified user area */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center">
              <span className="text-[10px] font-medium text-muted-foreground">E</span>
            </div>
            {!collapsed && (
              <span className="text-xs text-muted-foreground">Local Session</span>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Collapse / Expand toggle                                          */}
      {/* ----------------------------------------------------------------- */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-muted"
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {collapsed ? 'Expand' : 'Collapse'}
        </TooltipContent>
      </Tooltip>
    </motion.aside>
  );
}
