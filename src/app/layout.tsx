import type { Metadata } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeInitializer } from '@/components/ThemeInitializer';

import { GenerationProvider } from '@/lib/generation-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StorageWarningBanner } from '@/components/StorageWarningBanner';
import { PageTransition } from '@/components/PageTransition';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'New-S13n — Educational Content Authoring',
  description: 'Generate lecture notes, pre-lecture notes, and assignments with AI. A content authoring tool for educators.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('news13n_theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else if (theme === 'system') {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                      document.documentElement.classList.add('dark');
                    }
                  } else {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                      document.documentElement.classList.add('dark');
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`flex h-screen overflow-hidden bg-background md:overflow-hidden ${plusJakartaSans.variable}`}>
        <ThemeInitializer />
        <GenerationProvider>

          <ToastProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto min-w-0 pb-14 md:pb-0">
              <ErrorBoundary label="Something went wrong">
                <StorageWarningBanner />
                <PageTransition>{children}</PageTransition>
              </ErrorBoundary>
            </main>
          </ToastProvider>
        </GenerationProvider>
      </body>
    </html>
  );
}
