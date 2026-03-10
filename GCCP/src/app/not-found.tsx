'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileQuestion, Home, PenTool, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-16">
      {/* Animated illustration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative mb-8"
      >
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        </div>

        {/* Icon composition */}
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{
              y: [0, -6, 0],
              rotate: [0, -3, 3, 0],
            }}
            transition={{
              duration: 4,
              repeat: 2,
              ease: 'easeInOut',
            }}
            className="flex h-28 w-28 items-center justify-center rounded-2xl border border-border bg-card shadow-lg"
          >
            <FileQuestion className="h-14 w-14 text-primary/60" />
          </motion.div>

          {/* Floating decorative dots */}
          <motion.div
            animate={{ y: [0, -10, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3, repeat: 2, delay: 0.5 }}
            className="absolute -right-4 -top-4 h-3 w-3 rounded-full bg-primary/30"
          />
          <motion.div
            animate={{ y: [0, 8, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 3.5, repeat: 2, delay: 1 }}
            className="absolute -bottom-3 -left-5 h-2 w-2 rounded-full bg-primary/20"
          />
          <motion.div
            animate={{ x: [0, 6, 0], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.8, repeat: 2, delay: 0.8 }}
            className="absolute -right-6 bottom-2 h-2.5 w-2.5 rounded-full bg-primary/25"
          />
        </div>
      </motion.div>

      {/* Text content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8 flex flex-col items-center gap-3 text-center"
      >
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          The page you are looking for does not exist or has been moved. You can
          head back to the home page or jump straight into the content generator.
        </p>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="flex flex-wrap items-center justify-center gap-3"
      >
        <Button asChild variant="default" className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/editor">
            <PenTool className="h-4 w-4" />
            Open Editor
          </Link>
        </Button>
      </motion.div>

      {/* Subtle back link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-12"
      >
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.history.back();
            }
          }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Go back to previous page
        </button>
      </motion.div>
    </div>
  );
}
