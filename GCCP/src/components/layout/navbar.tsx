'use client';

import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Menu,
  Loader2,
  CircleDot,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MobileSidebarContent } from '@/components/layout/mobile-sidebar-content';

// ---------------------------------------------------------------------------
// Route label map
// ---------------------------------------------------------------------------

const routeLabels: Record<string, string> = {
  '/': 'Home',
  '/editor': 'Generate',
  '/archives': 'Library',
  '/settings': 'Settings',
};

function getPageLabel(pathname: string): string {
  if (routeLabels[pathname]) return routeLabels[pathname];
  // Fallback: try prefix match
  for (const [route, label] of Object.entries(routeLabels)) {
    if (route !== '/' && pathname.startsWith(route)) return label;
  }
  return 'GCCP';
}

// ---------------------------------------------------------------------------
// Navbar Component
// ---------------------------------------------------------------------------

export function Navbar() {
  const pathname = usePathname();
  const isGenerating = useAppStore((s) => s.isGenerating);
  const costDetails = useAppStore((s) => s.costDetails);
  const currentAgent = useAppStore((s) => s.currentAgent);

  const pageLabel = getPageLabel(pathname);
  const totalCost = costDetails.totalCost;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      {/* ----------------------------------------------------------------- */}
      {/* Mobile hamburger + Sheet                                          */}
      {/* ----------------------------------------------------------------- */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[260px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <MobileSidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Logo (mobile only)                                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary">
          <span className="text-xs font-bold text-white">G</span>
        </div>
        <span className="text-sm font-bold tracking-tight text-foreground">
          GCCP
        </span>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Page badge                                                        */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center">
        <motion.div
          key={pageLabel}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className=""
        >
          <span className="text-xs font-medium text-muted-foreground">{pageLabel}</span>
        </motion.div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* ----------------------------------------------------------------- */}
      {/* Cost display (visible during / after generation)                  */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {totalCost > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="hidden items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground sm:flex"
          >
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span>${totalCost.toFixed(4)}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* Status indicator                                                  */}
      {/* ----------------------------------------------------------------- */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          isGenerating
            ? 'bg-warning/10 text-warning'
            : 'text-muted-foreground'
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="hidden sm:inline">
              {currentAgent ? `${currentAgent}...` : 'Generating...'}
            </span>
            <span className="sm:hidden">Generating...</span>
          </>
        ) : (
          <>
            <CircleDot className="h-3 w-3" />
            <span>Ready</span>
          </>
        )}
      </div>
    </header>
  );
}
