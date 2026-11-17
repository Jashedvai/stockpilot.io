import type { Transition, Variants } from 'motion/react';

/**
 * Apple-style spring & deceleration curves.
 * Designed for crisp tactile feedback (<= 200ms perceived settle) using
 * compositor-only properties (transform, opacity).
 */
export const APPLE_EASE = [0.16, 1, 0.3, 1] as const;

export const APPLE_SPRING: Transition = {
  type: 'spring',
  stiffness: 480,
  damping: 36,
  mass: 0.85,
};

export const APPLE_SNAPPY_SPRING: Transition = {
  type: 'spring',
  stiffness: 560,
  damping: 38,
  mass: 0.75,
};

export const APPLE_GENTLE_SPRING: Transition = {
  type: 'spring',
  stiffness: 340,
  damping: 32,
  mass: 0.95,
};

export const appleViewVariants: Variants = {
  initial: { opacity: 0, y: 8, scale: 0.996 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: APPLE_EASE },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.996,
    transition: { duration: 0.14, ease: APPLE_EASE },
  },
};

export const appleStaggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const appleStaggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: APPLE_EASE },
  },
};

export const appleModalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: 'easeIn' } },
};

export const appleModalSheetVariants: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 12 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: APPLE_SPRING,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.14, ease: APPLE_EASE },
  },
};

export const appleAlertVariants: Variants = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: APPLE_SPRING },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } },
};
