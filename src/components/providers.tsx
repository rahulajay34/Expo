'use client';

import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OfflineBanner } from '@/components/features/offline-banner';
import { IndexedDBChecker } from '@/components/features/indexeddb-checker';
import { NavigationProgress } from '@/components/layout/navigation-progress';

/**
 * Reads the saved accent color from localStorage and applies the
 * `data-accent` attribute to the document element on mount.
 */
function AccentColorInitializer() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem('gccp-accent-color');
      if (stored && stored !== 'indigo') {
        document.documentElement.setAttribute('data-accent', stored);
      }
    } catch {
      // localStorage unavailable — use default
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <TooltipProvider delayDuration={300}>
        <AccentColorInitializer />
        <NavigationProgress />
        <OfflineBanner />
        <IndexedDBChecker />
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
      </TooltipProvider>
    </ThemeProvider>
  );
}
