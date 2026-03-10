'use client';

import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/use-mobile';
import { Navbar } from '@/components/layout/navbar';

export function MainContentClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const isMobile = useIsMobile();

  // On mobile the sidebar is hidden, so no left margin is needed.
  // On desktop we offset by the sidebar width (240px expanded, 64px collapsed).
  const marginLeft = isMobile ? 0 : sidebarOpen ? 240 : 64;

  return (
    <div
      className="flex min-h-screen flex-col transition-[margin-left] duration-300 ease-in-out"
      style={{ marginLeft }}
    >
      {/* Top navbar */}
      <Navbar />

      {/* Page content */}
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex-1"
      >
        {children}
      </motion.main>
    </div>
  );
}
