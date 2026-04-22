'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Power } from 'lucide-react';

export function ToggleButton({
  promotionId,
  isActive,
}: {
  promotionId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    const next = !isActive;
    const msg = next
      ? '오픈기념 프로모션을 활성화하시겠습니까?\n\n• 즉시 모든 신규 예약에 적용됩니다\n• 1·3·6·12개월 결제가 무료 개월 방식으로 전환됩니다'
      : '오픈기념 프로모션을 비활성화하시겠습니까?\n\n• 즉시 장기할인(10/15/20%)으로 복귀합니다\n• 이미 계약된 건에는 영향 없음';
    if (!window.confirm(msg)) return;

    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/promotions/${promotionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `변경 실패 (${res.status})`);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`touch-target inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-wait ${
          isActive
            ? 'bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/20'
            : 'bg-amber-600/15 border border-amber-600/30 text-amber-300 hover:bg-amber-600/20'
        }`}
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
        {isActive ? '비활성화' : '활성화'}
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
