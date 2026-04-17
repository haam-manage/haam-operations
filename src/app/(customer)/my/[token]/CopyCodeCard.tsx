'use client';

import { Shield, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export function CopyCodeCard({ code }: { code: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      if (navigator.vibrate) navigator.vibrate(10);
      toast.success('보안코드가 복사되었습니다');
    } catch {
      toast.error('복사에 실패했습니다');
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleCopy}
      className="w-full glass-warm glow-warm p-6 text-center mb-5 cursor-pointer active:bg-amber-900/10 transition-colors"
    >
      <div className="w-12 h-12 rounded-2xl bg-amber-900/20 border border-amber-800/20 flex items-center justify-center mx-auto mb-3">
        <Shield className="w-6 h-6 text-amber-500" />
      </div>
      <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">Security Code</p>
      <p className="font-mono font-bold text-4xl text-white tracking-[0.3em]">{code}</p>
      <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-stone-500">
        <Copy className="w-3 h-3" />
        탭하여 복사
      </div>
    </motion.button>
  );
}
