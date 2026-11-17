import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  APPLE_EASE,
  APPLE_SPRING,
  appleModalBackdropVariants,
  appleModalSheetVariants,
  appleViewVariants,
} from '../lib/motion';

interface AppleModalProps {
  open: boolean;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
}

/**
 * macOS / iOS frosted glass sheet modal with spring presentation and Escape handling.
 */
export const AppleModal: React.FC<AppleModalProps> = ({
  open,
  onClose,
  maxWidthClass = 'max-w-lg',
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="apple-modal-backdrop"
          variants={appleModalBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/35 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            key="apple-modal-sheet"
            variants={appleModalSheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className={`w-full ${maxWidthClass} glass-modal rounded-3xl overflow-hidden will-change-transform`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface AppleSegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  className?: string;
  buttonClassName?: string;
}

/**
 * iOS / macOS segmented control with shared-layout spring pill glide.
 */
export function AppleSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  className = '',
  buttonClassName = 'px-3.5 py-1.5 text-xs',
}: AppleSegmentedControlProps<T>) {
  return (
    <div className={`flex flex-wrap items-center gap-1 p-1 glass-segmented rounded-xl ${className}`}>
      {options.map((opt) => {
        const active = value === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`relative ${buttonClassName} font-medium rounded-[9px] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              active
                ? 'text-[#1d1d1f] dark:text-white'
                : 'text-[#5a5a60] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={APPLE_SPRING}
                className="absolute inset-0 rounded-[9px] bg-white/90 dark:bg-[#3a3a3c]/90 shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{opt.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface AppleViewTransitionProps {
  viewKey: string;
  children: React.ReactNode;
  className?: string;
}

export const AppleViewTransition: React.FC<AppleViewTransitionProps> = ({
  viewKey,
  children,
  className = '',
}) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={viewKey}
      variants={appleViewVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

interface AppleButtonProps extends React.ComponentPropsWithoutRef<typeof motion.button> {
  children: React.ReactNode;
}

export const AppleTactileButton: React.FC<AppleButtonProps> = ({ children, className = '', ...rest }) => (
  <motion.button
    whileHover={{ scale: 1.015 }}
    whileTap={{ scale: 0.97 }}
    transition={{ duration: 0.14, ease: APPLE_EASE }}
    className={className}
    {...rest}
  >
    {children}
  </motion.button>
);
