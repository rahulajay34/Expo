'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setIsVisible(false);
      // Short delay, then show with animation
      const t = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      prevPathRef.current = pathname;
      return () => cancelAnimationFrame(t);
    }
  }, [pathname]);

  return (
    <div
      className={`page-transition ${isVisible ? 'page-enter-active' : 'page-enter'}`}
      style={{ minHeight: '100%', width: '100%' }}
    >
      {children}
    </div>
  );
}
