'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { KeyRound, X, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * Non-blocking banner that warns when the Gemini API key is not configured.
 * Calls /api/health on mount to check.
 */
export function ApiKeyBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkApiKey() {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) {
          if (!cancelled) setShow(true);
          return;
        }
        const data = await res.json();
        if (!cancelled && !data.configured) {
          setShow(true);
        }
      } catch {
        // Network error — don't show the banner (offline banner handles this)
      }
    }

    checkApiKey();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
      >
        <Alert variant="destructive" className="relative">
          <KeyRound className="size-4" />
          <AlertTitle>Gemini API key not configured</AlertTitle>
          <AlertDescription>
            <p>
              Go to{' '}
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 font-medium underline underline-offset-4 hover:text-destructive"
              >
                <Settings className="inline size-3" />
                Settings
              </Link>{' '}
              to add your key. Generation will not work without it.
            </p>
          </AlertDescription>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="absolute right-2 top-2 shrink-0 text-destructive/70 hover:text-destructive"
          >
            <X className="size-3.5" />
          </Button>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}
