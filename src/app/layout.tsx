import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';
import { GenerationProvider } from '@/lib/generation-context';

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex h-screen overflow-hidden bg-background">
        <GenerationProvider>
          <ToastProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto min-w-0">
              {children}
            </main>
          </ToastProvider>
        </GenerationProvider>
      </body>
    </html>
  );
}
