'use client';

import { useEffect, useMemo } from 'react';
import { motion, useSpring, useReducedMotion } from 'framer-motion';
import type { VelocityBand } from '@/lib/generation-context';

interface TokenVelocityPulseProps {
  /** Current velocity band */
  band: VelocityBand;
  /** Whether generation is active */
  active: boolean;
  /** Size in px (default 8) */
  size?: number;
  className?: string;
}

/**
 * Pulsing dot indicator that reflects AI output speed.
 * Pulse frequency is driven by token velocity band:
 *   fast (>30 tok/s) -> rapid 0.5s cycle
 *   normal (10-30)   -> medium 1.5s cycle
 *   slow (<10)       -> gentle 3s breathing
 *   stalled (0, >2s) -> no pulse, dim "thinking" state
 */
export function TokenVelocityPulse({ band, active, size = 8, className = '' }: TokenVelocityPulseProps) {
  const prefersReducedMotion = useReducedMotion();

  // Spring config per band
  const springConfig = useMemo(() => {
    switch (band) {
      case 'fast':
        return { stiffness: 600, damping: 10 };
      case 'normal':
        return { stiffness: 200, damping: 15 };
      case 'slow':
        return { stiffness: 80, damping: 20 };
      case 'stalled':
      default:
        return { stiffness: 40, damping: 25 };
    }
  }, [band]);

  const scale = useSpring(1, springConfig);
  const opacity = useSpring(1, { stiffness: 200, damping: 20 });

  // Pulse animation loop driven by velocity band
  useEffect(() => {
    if (!active || prefersReducedMotion) {
      scale.set(1);
      opacity.set(active ? 0.5 : 0);
      return;
    }

    if (band === 'stalled') {
      scale.set(1);
      opacity.set(0.4);
      return;
    }

    const cycleDuration = band === 'fast' ? 500 : band === 'normal' ? 1500 : 3000;
    let frame: number;
    let expanding = true;

    const minScale = 0.8;
    const maxScale = 1.3;

    opacity.set(1);

    const tick = () => {
      if (expanding) {
        scale.set(maxScale);
        expanding = false;
      } else {
        scale.set(minScale);
        expanding = true;
      }
      frame = window.setTimeout(tick, cycleDuration / 2);
    };

    tick();

    return () => {
      if (frame) window.clearTimeout(frame);
    };
  }, [band, active, prefersReducedMotion, scale, opacity]);

  // Disappear when not active
  useEffect(() => {
    if (!active) {
      opacity.set(0);
    }
  }, [active, opacity]);

  if (!active && !prefersReducedMotion) {
    return null;
  }

  return (
    <motion.span
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: 'var(--accent)',
        scale,
        opacity,
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );
}
