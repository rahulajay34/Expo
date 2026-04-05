import type { Metadata } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Sidebar, MobileBottomNav } from '@/components/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/lib/theme-context';

import { GenerationProvider } from '@/lib/generation-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StorageWarningBanner } from '@/components/StorageWarningBanner';
import { PageTransition } from '@/components/PageTransition';
import { Suspense } from 'react';
import { RouteProgressBar } from '@/components/RouteProgressBar';

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
    <html lang="en" suppressHydrationWarning className={plusJakartaSans.variable}>
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
                  var d = document.documentElement;
                  var theme = localStorage.getItem('news13n_theme');
                  var isDark = false;
                  if (theme === 'dark') {
                    d.classList.add('dark');
                    isDark = true;
                  } else if (theme !== 'light') {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                      d.classList.add('dark');
                      isDark = true;
                    }
                  }

                  // Accent color flash prevention
                  var presets = {
                    blue:['#2383E2','35,131,226','#6BA3E8','107,163,232'],
                    purple:['#7C3AED','124,58,237','#A78BFA','167,139,250'],
                    green:['#059669','5,150,105','#34D399','52,211,153'],
                    orange:['#D97706','217,119,6','#FBBF24','251,191,36'],
                    pink:['#DB2777','219,39,119','#F472B6','244,114,182'],
                    teal:['#0D9488','13,148,136','#2DD4BF','45,212,191'],
                    red:['#DC2626','220,38,38','#F87171','248,113,113'],
                    indigo:['#4F46E5','79,70,229','#818CF8','129,140,248']
                  };
                  var accent = localStorage.getItem('news13n_accent');
                  if (accent && presets[accent]) {
                    var p = presets[accent];
                    d.style.setProperty('--accent', isDark ? p[2] : p[0]);
                    d.style.setProperty('--accent-rgb', isDark ? p[3] : p[1]);
                  }

                  // Font flash prevention
                  var fontMap = {
                    'inter':["'Inter'",'Inter'],
                    'source-sans':["'Source Sans 3'",'Source+Sans+3'],
                    'nunito':["'Nunito'",'Nunito'],
                    'rubik':["'Rubik'",'Rubik'],
                    'space-grotesk':["'Space Grotesk'",'Space+Grotesk'],
                    'dm-sans':["'DM Sans'",'DM+Sans'],
                    'outfit':["'Outfit'",'Outfit'],
                    'raleway':["'Raleway'",'Raleway'],
                    'lora':["'Lora'",'Lora']
                  };
                  var font = localStorage.getItem('news13n_font');
                  if (font && fontMap[font]) {
                    var f = fontMap[font];
                    var link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = 'https://fonts.googleapis.com/css2?family=' + f[1] + ':wght@400;500;600;700&display=swap';
                    document.head.appendChild(link);
                    d.style.setProperty('--font-custom', f[0] + ", var(--font-plus-jakarta), system-ui, sans-serif");
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="flex h-screen overflow-hidden bg-background md:overflow-hidden">
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <ThemeProvider>
        <GenerationProvider>
          <ToastProvider>
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden min-w-0 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
              <ErrorBoundary label="Something went wrong">
                <StorageWarningBanner />
                <PageTransition>{children}</PageTransition>
              </ErrorBoundary>
            </main>
            <MobileBottomNav />
          </ToastProvider>
        </GenerationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
