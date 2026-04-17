'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', loading, children, className, disabled, onClick, type = 'button' }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileTap={!isDisabled ? { scale: 0.97 } : undefined}
      transition={{ duration: 0.1 }}
      className={cn(
        variant === 'primary' ? 'btn-primary' : 'btn-ghost',
        'min-h-[48px] gap-2',
        className,
      )}
      disabled={isDisabled}
      onClick={onClick}
      type={type}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>처리 중...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
