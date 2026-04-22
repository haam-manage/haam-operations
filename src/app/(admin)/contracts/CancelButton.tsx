'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

export function CancelButton({ contractId, label }: { contractId: string; label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    const confirmed = window.confirm(
      `이 예약을 삭제하시겠습니까?\n\n• ${label}\n• 결제 대기 중인 주문 기록도 함께 삭제됩니다\n• 해당 보관함은 다시 예약 가능 상태로 복구됩니다\n\n되돌릴 수 없습니다.`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/contracts/${contractId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `삭제 실패 (${res.status})`);
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="touch-target inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-wait"
      >
        {isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Trash2 className="w-3 h-3" />
        )}
        취소
      </button>
      {error && (
        <span className="ml-1 text-[10px] text-red-400">{error}</span>
      )}
    </>
  );
}
