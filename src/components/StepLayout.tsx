'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, LogOut, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface StepLayoutProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onHome?: () => void;
  children: React.ReactNode;
  bottomCTA?: React.ReactNode;
  direction?: 'forward' | 'back';
  showLogout?: boolean;
}

export function StepLayout({ step, totalSteps, title, subtitle, onBack, onHome, children, bottomCTA, direction = 'forward', showLogout = true }: StepLayoutProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    if (!confirm('로그아웃 하시겠어요?')) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/');
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0c0a09]/90 backdrop-blur-lg border-b border-white/5 safe-top">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
          {onBack ? (
            <button onClick={onBack} aria-label="뒤로" className="touch-target w-10 h-10 -ml-2 text-stone-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : onHome ? (
            <button onClick={onHome} aria-label="홈" className="touch-target w-10 h-10 -ml-2 text-stone-400 hover:text-amber-400 transition-colors">
              <Home className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10" />
          )}
          <div className="w-6" />
          {showLogout ? (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="로그아웃"
              className="touch-target w-10 h-10 -mr-2 text-stone-400 flex items-center justify-center"
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-white/5">
          <motion.div
            className="h-full bg-amber-700"
            initial={false}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-5 pt-6 pb-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: direction === 'forward' ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction === 'forward' ? -40 : 40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {subtitle && <p className="text-xs text-amber-700 uppercase tracking-widest mb-1">{subtitle}</p>}
            <h2 className="text-xl font-bold text-white mb-6">{title}</h2>
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Bottom CTA */}
      {bottomCTA && (
        <div className="sticky-bottom">
          <div className="max-w-lg mx-auto">
            {bottomCTA}
          </div>
        </div>
      )}
    </main>
  );
}
