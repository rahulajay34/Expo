'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

/**
 * A motion.div wrapper that adds subtle hover-scale (1.02) and
 * tap-spring (0.98) micro-interactions to any child (typically a
 * Button or Link-wrapped Button).
 *
 * Usage:
 *   <AnimatedButton>
 *     <Button size="lg">Click me</Button>
 *   </AnimatedButton>
 */
export const AnimatedButton = forwardRef<
  HTMLDivElement,
  HTMLMotionProps<'div'> & { children: React.ReactNode }
>(function AnimatedButton({ children, className, ...props }, ref) {
  return (
    <motion.div
      ref={ref}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      style={{ display: 'inline-block', willChange: 'transform', ...props.style }}
      {...props}
    >
      {children}
    </motion.div>
  );
});
