'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, X, Trash2 } from 'lucide-react';

export type PromotionType = 'discount_rate' | 'free_months' | 'fixed_discount';

export interface PromotionFormValues {
  id?: string;
  name: string;
  type: PromotionType;
  isActive: boolean;
  priority: number;
  isNewOnly: boolean;
  applicableSizes: string[] | null;
  applicableMonths: number[] | null;
  discountRate: string | null; // "0.15"
  freeMonths: number | null;
  discountAmount: number | null;
  startsAt: string | null; // yyyy-mm-dd
  endsAt: string | null;
}

const EMPTY: PromotionFormValues = {
  name: '',
  type: 'discount_rate',
  isActive: false,
  priority: 0,
  isNewOnly: false,
  applicableSizes: null,
  applicableMonths: null,
  discountRate: '0.10',
  freeMonths: null,
  discountAmount: null,
  startsAt: null,
  endsAt: null,
};

export function PromotionForm({
  initial,
  onCancel,
}: {
  initial?: PromotionFormValues;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [v, setV] = useState<PromotionFormValues>(initial ?? EMPTY);
  const isEdit = !!initial?.id;

  const submit = () => {
    setError(null);

    const payload: Record<string, unknown> = {
      name: v.name.trim(),
      type: v.type,
      isActive: v.isActive,
      priority: Number(v.priority) || 0,
      isNewOnly: v.isNewOnly,
      applicableSizes: v.applicableSizes,
      applicableMonths: v.applicableMonths,
      discountRate: v.type === 'discount_rate' ? Number(v.discountRate) : null,
      freeMonths: v.type === 'free_months' ? v.freeMonths : null,
      discountAmount: v.type === 'fixed_discount' ? v.discountAmount : null,
      startsAt: v.startsAt || null,
      endsAt: v.endsAt || null,
    };

    startTransition(async () => {
      const url = isEdit ? `/api/admin/promotions/${v.id}` : '/api/admin/promotions';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `저장 실패 (${res.status})`);
        return;
      }
      onCancel?.();
      router.refresh();
    });
  };

  const remove = () => {
    if (!v.id) return;
    if (!window.confirm(`프로모션을 삭제하시겠습니까?\n\n• ${v.name}\n• 되돌릴 수 없습니다.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/promotions/${v.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `삭제 실패 (${res.status})`);
        return;
      }
      onCancel?.();
      router.refresh();
    });
  };

  const toggleSize = (s: 'M' | 'L' | 'XL') => {
    const cur = v.applicableSizes ?? [];
    const next = cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s];
    setV({ ...v, applicableSizes: next.length ? next : null });
  };

  const toggleMonth = (m: number) => {
    const cur = v.applicableMonths ?? [];
    const next = cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m].sort((a, b) => a - b);
    setV({ ...v, applicableMonths: next.length ? next : null });
  };

  return (
    <div className="glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{isEdit ? '프로모션 수정' : '새 프로모션'}</h3>
        {onCancel && (
          <button type="button" onClick={onCancel} className="touch-target w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-300">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Field label="이름">
        <input
          value={v.name}
          onChange={e => setV({ ...v, name: e.target.value })}
          placeholder="예: 오픈기념 3개월 1달 무료"
          className="input-dark w-full px-3 py-2 text-sm"
        />
      </Field>

      <Field label="유형">
        <select value={v.type} onChange={e => setV({ ...v, type: e.target.value as PromotionType })} className="input-dark w-full px-3 py-2 text-sm">
          <option value="discount_rate">할인율 (%)</option>
          <option value="free_months">무료 개월</option>
          <option value="fixed_discount">금액 할인 (원)</option>
        </select>
      </Field>

      {v.type === 'discount_rate' && (
        <Field label="할인율 (0~1, 예: 0.15 = 15%)">
          <input
            type="number" step="0.01" min="0.01" max="0.99"
            value={v.discountRate ?? ''}
            onChange={e => setV({ ...v, discountRate: e.target.value })}
            className="input-dark w-full px-3 py-2 text-sm"
          />
        </Field>
      )}

      {v.type === 'free_months' && (
        <Field label="무료 개월 수">
          <input
            type="number" min="1" step="1"
            value={v.freeMonths ?? ''}
            onChange={e => setV({ ...v, freeMonths: e.target.value ? Number(e.target.value) : null })}
            className="input-dark w-full px-3 py-2 text-sm"
          />
        </Field>
      )}

      {v.type === 'fixed_discount' && (
        <Field label="할인 금액 (원)">
          <input
            type="number" min="0" step="1000"
            value={v.discountAmount ?? ''}
            onChange={e => setV({ ...v, discountAmount: e.target.value ? Number(e.target.value) : null })}
            className="input-dark w-full px-3 py-2 text-sm"
          />
        </Field>
      )}

      <Field label="적용 사이즈 (미선택 = 전체)">
        <div className="flex gap-2">
          {(['M', 'L', 'XL'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSize(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                (v.applicableSizes ?? []).includes(s)
                  ? 'bg-amber-600/15 border-amber-600/30 text-amber-300'
                  : 'bg-white/3 border-white/10 text-stone-400 hover:text-stone-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>

      <Field label="적용 개월 (미선택 = 전체)">
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => toggleMonth(m)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
                (v.applicableMonths ?? []).includes(m)
                  ? 'bg-amber-600/15 border-amber-600/30 text-amber-300'
                  : 'bg-white/3 border-white/10 text-stone-400 hover:text-stone-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="시작일 (비우면 즉시)">
          <input
            type="date"
            value={v.startsAt ?? ''}
            onChange={e => setV({ ...v, startsAt: e.target.value || null })}
            className="input-dark w-full px-3 py-2 text-sm"
          />
        </Field>
        <Field label="종료일 (비우면 무제한)">
          <input
            type="date"
            value={v.endsAt ?? ''}
            onChange={e => setV({ ...v, endsAt: e.target.value || null })}
            className="input-dark w-full px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="우선순위 (숫자 클수록 먼저)">
          <input
            type="number"
            value={v.priority}
            onChange={e => setV({ ...v, priority: Number(e.target.value) || 0 })}
            className="input-dark w-full px-3 py-2 text-sm"
          />
        </Field>
        <div className="flex flex-col gap-2 justify-end">
          <label className="flex items-center gap-2 text-xs text-stone-400 cursor-pointer">
            <input
              type="checkbox"
              checked={v.isActive}
              onChange={e => setV({ ...v, isActive: e.target.checked })}
              className="accent-amber-600"
            />
            즉시 활성화
          </label>
          <label className="flex items-center gap-2 text-xs text-stone-400 cursor-pointer">
            <input
              type="checkbox"
              checked={v.isNewOnly}
              onChange={e => setV({ ...v, isNewOnly: e.target.checked })}
              className="accent-amber-600"
            />
            신규 계약만
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="btn-primary py-2.5 px-5 text-sm gap-1.5 disabled:opacity-40"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          저장
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="btn-ghost py-2.5 px-3 text-sm gap-1.5 text-red-400 hover:text-red-300 disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-stone-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
