'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { springGentle } from '@/lib/motion';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <motion.div
        className="max-w-md text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springGentle}
      >
        <p
          className="text-[48px] font-bold leading-none"
          style={{ color: 'var(--text-secondary)', opacity: 0.3 }}
        >
          404
        </p>

        <h1
          className="mt-4 text-[24px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Page not found
        </h1>

        <p
          className="mt-2 text-[16px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center font-medium rounded-md px-4 py-2 text-sm bg-accent text-white hover:bg-accent/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
          >
            Go to Generate
          </Link>
          <Link
            href="/content"
            className="inline-flex items-center justify-center font-medium rounded-md px-4 py-2 text-sm text-text-secondary hover:bg-sidebar hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
          >
            Content Library
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
