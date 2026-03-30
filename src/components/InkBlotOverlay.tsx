'use client';
import { useEffect, useState } from 'react';

interface InkBlotOverlayProps {
  activate: boolean;
  x: number;
  y: number;
  onComplete: () => void;
}

export function InkBlotOverlay({ activate, x, y, onComplete }: InkBlotOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (activate) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 420);
      return () => clearTimeout(t);
    }
  }, [activate, x, y, onComplete]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'white',
        clipPath: `circle(0px at ${x}px ${y}px)`,
        animation: 'ink-blot-in 0.42s cubic-bezier(0.76, 0, 0.24, 1) forwards',
        pointerEvents: 'none',
      }}
    />
  );
}
