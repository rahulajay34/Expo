'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { springGentle, springSnappy } from '@/lib/motion';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <motion.div
        className="max-w-md text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springGentle}
      >
        <h1
          className="text-[24px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Something went wrong
        </h1>

        <p
          className="mt-2 text-[16px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          An unexpected error occurred. Please try again.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center font-medium rounded-md px-4 py-2 text-sm bg-accent text-white hover:bg-accent/90 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center font-medium rounded-md px-4 py-2 text-sm text-text-secondary hover:bg-sidebar hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
          >
            Go home
          </Link>
        </div>

        <div className="mt-6">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs cursor-pointer transition-colors focus:outline-none"
            style={{ color: 'var(--text-secondary)' }}
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={springSnappy}
                className="overflow-hidden"
              >
                <pre
                  className="mt-3 rounded-lg p-3 text-sm text-left overflow-auto max-h-48 font-mono"
                  style={{
                    backgroundColor: 'var(--code-bg)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {error.message}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
