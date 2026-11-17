import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { apiRequest, setAuthToken } from '../lib/api';
import { User } from '../types';
import { APPLE_EASE, APPLE_SPRING, appleAlertVariants, appleStaggerContainer, appleStaggerItem } from '../lib/motion';

interface AuthScreenProps {
  onAuthenticated: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await credential.user.getIdToken();
      setAuthToken(idToken);
      const res = await apiRequest<{ user: User }>('/api/auth/me');
      onAuthenticated(res.user);
    } catch (err: unknown) {
      setAuthToken(null);
      setError(err instanceof Error ? err.message : 'Google Sign-In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch">
      {/* Left Space Black Glass Architectural Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#080a10] overflow-hidden">
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full opacity-[0.14] text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="stockpilot-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#stockpilot-grid)" />
        </svg>
        <div
          className="absolute -inset-6 animate-apple-aurora pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 75% 65% at 80% 15%, rgba(10, 132, 255, 0.34), transparent 70%), radial-gradient(ellipse 65% 55% at 15% 88%, rgba(94, 92, 230, 0.25), transparent 65%), radial-gradient(ellipse 45% 40% at 55% 55%, rgba(52, 199, 89, 0.12), transparent 65%)',
          }}
        />

        <motion.div
          variants={appleStaggerContainer}
          initial="initial"
          animate="animate"
          className="relative z-10 w-full p-14 flex flex-col justify-between text-[#f5f5f7]"
        >
          <motion.div variants={appleStaggerItem} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-white/90 backdrop-blur-md text-[#1d1d1f] flex items-center justify-center font-display font-bold text-lg shadow-lg">
              S
            </div>
            <span className="font-display font-semibold text-xl tracking-[-0.02em]">StockPilot</span>
          </motion.div>

          <div className="max-w-lg space-y-5">
            <motion.p variants={appleStaggerItem} className="text-xs font-medium tracking-wide text-[#0a84ff]">
              Centralized Operations · Relational Operations Ledger
            </motion.p>
            <motion.h1
              variants={appleStaggerItem}
              className="text-4xl font-display font-semibold leading-[1.12] tracking-[-0.03em] text-balance"
            >
              Complete control over products, suppliers, stock flow, and financial records.
            </motion.h1>
            <motion.p variants={appleStaggerItem} className="text-[15px] text-[#b0b3bc] leading-relaxed">
              Manage multi-warehouse inventory levels, process supplier purchase orders, issue customer sales invoices,
              coordinate team payroll, and inspect 30-day revenue analytics in one unified workspace.
            </motion.p>
            <motion.div
              variants={appleStaggerItem}
              className="pt-6 border-t border-white/[0.14] grid grid-cols-3 gap-4 text-xs"
            >
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.16, ease: APPLE_EASE }}
                className="p-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.1]"
              >
                <div className="text-[#8e8e93]">Stock Control</div>
                <div className="mt-1 font-medium text-white">Real-Time SKU Ledger</div>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.16, ease: APPLE_EASE }}
                className="p-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.1]"
              >
                <div className="text-[#8e8e93]">Procurement & POS</div>
                <div className="mt-1 font-medium text-white">Auto Stock-In / Out</div>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.16, ease: APPLE_EASE }}
                className="p-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.1]"
              >
                <div className="text-[#8e8e93]">Analytics Suite</div>
                <div className="mt-1 font-medium text-white">P&amp;L &amp; CSV Reports</div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Right Frosted Glass Authentication Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={APPLE_SPRING}
          className="w-full max-w-[420px] glass-surface rounded-3xl p-8 sm:p-9 space-y-6"
        >
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9px] bg-[#1d1d1f] dark:bg-white text-white dark:text-[#1d1d1f] flex items-center justify-center font-display font-bold">
              S
            </div>
            <span className="font-display font-semibold text-lg text-[#1d1d1f] dark:text-white">StockPilot</span>
          </div>

          <div>
            <h2 className="text-2xl font-display font-semibold tracking-[-0.02em] text-[#1d1d1f] dark:text-white">
              Sign in to StockPilot
            </h2>
            <p className="mt-1.5 text-[13px] text-[#5a5a60] dark:text-[#a1a1a6]">
              Access your centralized inventory, sales, and financial ledger with Google Sign-In.
            </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                key="auth-error"
                variants={appleAlertVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                role="alert"
                className="p-3 rounded-xl bg-[#ff3b30]/12 backdrop-blur-md border border-[#ff3b30]/25 text-xs text-[#d70015] dark:text-[#ff453a]"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-3 shadow-[0_6px_18px_rgba(0,113,227,0.32)] transition-colors group"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"
                />
              </svg>
              <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>

            <div className="p-3.5 rounded-2xl glass-inset flex items-start gap-2.5 text-xs text-[#5a5a60] dark:text-[#a1a1a6]">
              <ShieldCheck className="w-4 h-4 text-[#0071e3] dark:text-[#0a84ff] shrink-0 mt-0.5" />
              <span>
                Your workspace session is authenticated securely via Google OAuth and synchronized with your persistent
                inventory ledger.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
