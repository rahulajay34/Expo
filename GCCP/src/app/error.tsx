'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[GCCP Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-16">
      {/* Icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-28 w-28 rounded-full bg-destructive/10 blur-2xl" />
        </div>
        <motion.div
          animate={{ rotate: [0, -5, 5, -5, 0] }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-destructive/20 bg-card shadow-lg"
        >
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mb-8 flex flex-col items-center gap-3 text-center"
      >
        <h2 className="text-2xl font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          An unexpected error occurred while rendering this page. You can try
          again or navigate back to the home page.
        </p>

        {/* Error details (collapsed by default for clean UX) */}
        {error.message && (
          <details className="mt-2 w-full max-w-md rounded-lg border border-border bg-muted/50 text-left">
            <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              Error details
            </summary>
            <div className="border-t border-border px-4 py-3">
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                {error.message}
              </pre>
              {error.digest && (
                <p className="mt-2 text-[11px] text-muted-foreground/60">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          </details>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex flex-wrap items-center justify-center gap-3"
      >
        <Button onClick={reset} variant="default" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
