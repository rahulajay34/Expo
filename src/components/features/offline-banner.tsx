'use client';

import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';

/**
 * Sticky banner shown at the top of the viewport when the browser is offline.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="sticky top-0 z-[60] overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white dark:bg-amber-600">
            <WifiOff className="size-4" />
            You appear to be offline. Some features may not work.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
