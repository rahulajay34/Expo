import type { Metadata } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Sidebar, MobileBottomNav } from '@/components/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/lib/theme-context';

import { GenerationProvider } from '@/lib/generation-context';
import { ChatProvider } from '@/lib/chat-context';
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f0f0f" media="(prefers-color-scheme: dark)" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('news13n_theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else if (theme !== 'light') {
                    // theme is 'system' or null (first visit) — follow OS preference
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
        <ThemeProvider>
        <GenerationProvider>
          <ChatProvider>
          <ToastProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto min-w-0 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
              <ErrorBoundary label="Something went wrong">
                <StorageWarningBanner />
                <PageTransition>{children}</PageTransition>
              </ErrorBoundary>
            </main>
            <MobileBottomNav />
          </ToastProvider>
          </ChatProvider>
        </GenerationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
