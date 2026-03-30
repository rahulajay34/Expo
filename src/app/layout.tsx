import type { Metadata } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';

import { GenerationProvider } from '@/lib/generation-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
    <html lang="en">
      <body className={`flex h-screen overflow-hidden bg-background md:overflow-hidden ${plusJakartaSans.variable}`}>
        <GenerationProvider>

          <ToastProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto min-w-0 pb-14 md:pb-0">
              <ErrorBoundary label="Something went wrong">
                {children}
              </ErrorBoundary>
            </main>
          </ToastProvider>
        </GenerationProvider>
      </body>
    </html>
  );
}
