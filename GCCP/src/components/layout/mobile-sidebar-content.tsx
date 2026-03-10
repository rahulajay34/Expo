'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/lib/store';
import {
  Home,
  PenTool,
  Library,
  Settings,
  Moon,
  Sun,
  Monitor,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';

// ---------------------------------------------------------------------------
// Navigation items (duplicated for mobile — keeps the bundle focused)
// ---------------------------------------------------------------------------

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Generate', href: '/editor', icon: PenTool },
  { label: 'Library', href: '/archives', icon: Library },
  { label: 'Settings', href: '/settings', icon: Settings },
] as const;

const themeOptions = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
] as const;

// ---------------------------------------------------------------------------
// Mobile Sidebar Content
// ---------------------------------------------------------------------------

export function MobileSidebarContent() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const isGenerating = useAppStore((s) => s.isGenerating);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
          <span className="text-sm font-bold text-white">G</span>
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          GCCP
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <SheetClose key={item.href} asChild>
              <Link href={item.href} aria-label={item.label}>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                  )}

                  <item.icon
                    className={cn(
                      'h-[18px] w-[18px] shrink-0',
                      isActive
                        ? 'text-primary'
                        : 'text-foreground/50 group-hover:text-foreground/80'
                    )}
                  />

                  <span className="truncate">{item.label}</span>

                  {item.label === 'Generate' && isGenerating && (
                    <span className="relative ml-auto flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  )}
                </motion.div>
              </Link>
            </SheetClose>
          );
        })}
      </nav>

      {/* Bottom: Theme + User */}
      <div className="border-t border-border p-3">
        {/* Theme selector */}
        {mounted && (
          <div className="mb-3 flex items-center gap-1 px-1">
            {themeOptions.map((opt) => {
              const isActiveTheme = theme === opt.value;
              return (
                <Button
                  key={opt.value}
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setTheme(opt.value)}
                  aria-label={`Switch to ${opt.label} mode`}
                  className={cn(
                    'transition-colors',
                    isActiveTheme
                      ? 'bg-accent text-primary'
                      : 'text-foreground/40 hover:text-foreground/70'
                  )}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                </Button>
              );
            })}
            <span className="ml-auto text-[11px] text-foreground/40">
              Theme
            </span>
          </div>
        )}

        {/* User info */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              Educator
            </span>
            <span className="text-[11px] text-foreground/50">
              Local Session
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
