'use client';

import { motion } from 'framer-motion';

interface AnimatedCheckmarkProps {
  /** Overall size of the checkmark circle in pixels. Defaults to 48. */
  size?: number;
  /** Duration of the full animation in seconds. Defaults to 1. */
  duration?: number;
  /** CSS color for the circle and stroke. Defaults to #22c55e (green-500). */
  color?: string;
  /** Optional extra className on the wrapper. */
  className?: string;
}

/**
 * Animated SVG checkmark that draws itself.
 *
 * 1. Green circle scales in (0 -> 1).
 * 2. Checkmark stroke draws via stroke-dasharray/dashoffset.
 *
 * Total animation duration is ~1 second by default.
 */
export function AnimatedCheckmark({
  size = 48,
  duration = 1,
  color = '#22c55e',
  className,
}: AnimatedCheckmarkProps) {
  const circleDelay = 0;
  const circleDuration = duration * 0.4;
  const checkDelay = duration * 0.35;
  const checkDuration = duration * 0.45;

  // Checkmark path — a simple two-segment polyline inside a 48x48 viewBox
  const checkPath = 'M14 24 L22 32 L34 18';
  // Approximate length of that path for stroke-dasharray
  const checkPathLength = 36;

  return (
    <div
      className={className}
      style={{ width: size, height: size, position: 'relative' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Circle background — scales in */}
        <motion.circle
          cx="24"
          cy="24"
          r="22"
          fill={color}
          fillOpacity={0.15}
          stroke={color}
          strokeWidth="2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: circleDelay,
            duration: circleDuration,
            ease: [0.34, 1.56, 0.64, 1], // overshoot spring-like
          }}
          style={{ transformOrigin: '24px 24px' }}
        />

        {/* Checkmark stroke — draws itself */}
        <motion.path
          d={checkPath}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: {
              delay: checkDelay,
              duration: checkDuration,
              ease: 'easeOut',
            },
            opacity: {
              delay: checkDelay,
              duration: 0.05,
            },
          }}
          style={{
            strokeDasharray: checkPathLength,
            strokeDashoffset: 0,
          }}
        />
      </svg>
    </div>
  );
}
