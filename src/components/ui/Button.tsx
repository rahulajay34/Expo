'use client';

import { ButtonHTMLAttributes, forwardRef, useCallback, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type HTMLMotionProps,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { springSnappy } from '@/lib/motion';

/* ── Types ─────────────────────────────────────────────────── */

interface ButtonProps
  extends Omit<
    HTMLMotionProps<'button'> & ButtonHTMLAttributes<HTMLButtonElement>,
    'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'
  > {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

/* ── Magnetic Hover Hook (primary buttons only) ──────────── */

interface MagneticHoverResult {
  x: ReturnType<typeof useSpring>;
  y: ReturnType<typeof useSpring>;
  glowX: number;
  glowY: number;
  glowVisible: boolean;
  handlers: {
    onMouseMove: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onMouseLeave: () => void;
  };
}

const MAGNETIC_SPRING = { stiffness: 300, damping: 20, mass: 0.5 };

function useMagneticHover(strength: number = 4, enabled: boolean = true): MagneticHoverResult {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, MAGNETIC_SPRING);
  const y = useSpring(rawY, MAGNETIC_SPRING);

  const [glowX, setGlowX] = useState(0);
  const [glowY, setGlowY] = useState(0);
  const [glowVisible, setGlowVisible] = useState(false);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!enabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = e.clientX - centerX;
      const distY = e.clientY - centerY;

      // Normalize displacement to [-1, 1] range based on button dimensions,
      // then scale by strength to cap at `strength` px max
      const dx = (distX / (rect.width / 2)) * strength;
      const dy = (distY / (rect.height / 2)) * strength;

      // Clamp to strength
      const clampedDx = Math.max(-strength, Math.min(strength, dx));
      const clampedDy = Math.max(-strength, Math.min(strength, dy));

      rawX.set(clampedDx);
      rawY.set(clampedDy);

      // Glow position relative to button
      setGlowX(e.clientX - rect.left);
      setGlowY(e.clientY - rect.top);
      setGlowVisible(true);
    },
    [enabled, rawX, rawY, strength]
  );

  const onMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
    setGlowVisible(false);
  }, [rawX, rawY]);

  return { x, y, glowX, glowY, glowVisible, handlers: { onMouseMove, onMouseLeave } };
}

/* ── Touch device detection ──────────────────────────────── */

function useIsTouchDevice(): boolean {
  const ref = useRef<boolean | null>(null);
  if (ref.current === null) {
    if (typeof window === 'undefined') {
      ref.current = false;
    } else {
      ref.current = !window.matchMedia('(hover: hover)').matches;
    }
  }
  return ref.current;
}

/* ── Button Component ────────────────────────────────────── */

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, children, style, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    const isTouch = useIsTouchDevice();
    const isPrimary = variant === 'primary';

    // Magnetic hover — only for primary, non-disabled, non-touch, non-reduced-motion
    const magneticEnabled = isPrimary && !disabled && !isTouch && !reducedMotion;
    const { x, y, glowX, glowY, glowVisible, handlers } = useMagneticHover(4, magneticEnabled);

    // Press spring — all variants, respects reduced motion
    const tapScale = reducedMotion ? 1 : 0.96;

    // Hover scale for non-primary variants
    const hoverScale = !isPrimary && !disabled && !reducedMotion ? 1.02 : 1;

    return (
      <motion.button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-md transition-colors cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Position relative + overflow hidden for glow overlay
          isPrimary && 'relative overflow-hidden',
          {
            primary: 'bg-accent text-white hover:bg-accent/90',
            secondary: 'bg-background text-text-primary border border-border hover:bg-sidebar',
            ghost: 'text-text-secondary hover:bg-sidebar hover:text-text-primary',
            danger: 'bg-danger text-white hover:bg-danger/90',
          }[variant],
          {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-sm',
          }[size],
          className
        )}
        disabled={disabled}
        style={{
          ...style,
          x: magneticEnabled ? x : undefined,
          y: magneticEnabled ? y : undefined,
        }}
        whileTap={disabled ? undefined : { scale: tapScale }}
        whileHover={!isPrimary && !disabled ? { scale: hoverScale } : undefined}
        transition={springSnappy}
        onMouseMove={magneticEnabled ? handlers.onMouseMove : undefined}
        onMouseLeave={magneticEnabled ? handlers.onMouseLeave : undefined}
        {...props}
      >
        {/* Radial glow overlay — primary only */}
        {isPrimary && !disabled && (
          <span
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none rounded-[inherit] transition-opacity duration-200"
            style={{
              opacity: glowVisible ? 1 : 0,
              background: `radial-gradient(circle at ${glowX}px ${glowY}px, var(--magnetic-glow-color, rgba(255,255,255,0.10)) 0%, transparent 60%)`,
            }}
          />
        )}
        {/* Content needs relative positioning to sit above glow */}
        {isPrimary ? (
          <span className="relative z-[1] inline-flex items-center justify-center gap-[inherit]">
            {children}
          </span>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';
export { Button };
export type { ButtonProps };
