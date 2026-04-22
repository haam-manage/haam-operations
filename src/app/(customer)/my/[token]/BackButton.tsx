'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/my');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="뒤로"
      className="touch-target w-9 h-9 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}
