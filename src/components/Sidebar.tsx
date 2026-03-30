'use client';

import { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useGenerationContext } from '@/lib/generation-context';
import { AnimatedSVG } from '@/components/ui/AnimatedSVG';
import { NotificationCentre } from '@/components/NotificationCentre';

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

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isGenerating } = useGenerationContext();

  function handleNav(e: React.MouseEvent, href: string) {
    e.preventDefault();
    if (isGenerating) {
      const confirmed = window.confirm(
        'Content is still generating. If you leave now, the generation will be lost. Leave anyway?'
      );
      if (!confirmed) return;
    }
    router.push(href);
  }

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-border flex flex-col transition-all duration-200 shrink-0',
        'hidden md:flex',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 border-b border-border shrink-0 overflow-hidden',
        collapsed ? 'px-4 justify-center' : 'px-5'
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center shrink-0 text-white font-bold text-sm">N</div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-semibold text-sm text-text-primary leading-tight truncate">New-S13n</div>
              <div className="text-xs text-text-secondary leading-tight">Content Authoring</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <a
              key={href}
              href={href}
              onClick={(e) => { handleNav(e, href); }}
              className={cn(
                'flex items-center h-9 mx-2 mb-0.5 rounded-md text-sm transition-colors cursor-pointer',
                collapsed ? 'px-0 justify-center' : 'px-3 gap-3',
                isActive
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-secondary hover:bg-border/70 hover:text-text-primary'
              )}
              title={collapsed ? label : undefined}
            >
              <span className="shrink-0">{icon}</span>
              {!collapsed && <span className="truncate">{label}</span>}
            </a>
          );
        })}
      </nav>

      <div className="shrink-0 py-2 border-t border-border">
        <NotificationCentre collapsed={collapsed} />
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-11 border-t border-border text-text-secondary hover:text-text-primary hover:bg-sidebar/80 transition-colors shrink-0"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn('transition-transform duration-200', collapsed && 'rotate-180')}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Mobile bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-border flex items-center justify-around z-30 md:hidden">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <a
              key={href}
              href={href}
              onClick={(e) => { e.preventDefault(); handleNav(e, href); }}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 flex-1 min-w-0 ${
                isActive ? 'text-accent' : 'text-text-secondary'
              }`}
            >
              <span className="w-5 h-5">{icon}</span>
              <span className="text-[10px] truncate">{label}</span>
            </a>
          );
        })}
        <NotificationCentre isMobile />
      </div>
    </aside>
  );
}
