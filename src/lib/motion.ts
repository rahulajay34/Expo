import type { Transition, Variants } from 'framer-motion';

/* ── Spring Presets ─────────────────────────────────────────── */

/** Snappy spring for micro-interactions: hovers, clicks, toggles */
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

/** Gentle spring for modals, panels, larger elements */
export const springGentle: Transition = {
  type: 'spring',
  stiffness: 150,
  damping: 20,
};

/** Bouncy spring for celebratory moments, checkmarks */
export const springBouncy: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 15,
};

/** Crisp spring for tab/segment sliding indicators */
export const springTab: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
};

/* ── Duration presets (tween fallbacks for reduced motion) ── */

export const reducedMotionTransition: Transition = {
  duration: 0,
};

/* ── Common Variants ────────────────────────────────────────── */

/** Fade-in from below (default page/section entrance) */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springSnappy,
  },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

/** Scale-in from center (modals, popovers) */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springGentle,
  },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

/** Backdrop fade */
export const backdropFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Dropdown (scale-Y from top) */
export const dropdownVariants: Variants = {
  hidden: { opacity: 0, scaleY: 0.85, y: -4 },
  visible: {
    opacity: 1,
    scaleY: 1,
    y: 0,
    transition: springSnappy,
  },
  exit: { opacity: 0, scaleY: 0.9, transition: { duration: 0.12 } },
};

/** Staggered children container (for dropdowns/menus — spring easing, no delay) */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.035,
    },
  },
};

/** Item for staggered list (for dropdowns/menus — spring easing, upward entry) */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springSnappy,
  },
};

/** Slide from right (forward navigation) */
export const slideRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springSnappy,
  },
  exit: { opacity: 0, x: -24, transition: { duration: 0.15 } },
};

/** Slide from left (backward navigation) */
export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springSnappy,
  },
  exit: { opacity: 0, x: 24, transition: { duration: 0.15 } },
};
