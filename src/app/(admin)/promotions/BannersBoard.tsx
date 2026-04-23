'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Loader2, Power, Trash2, Save, X, Megaphone } from 'lucide-react';

export interface BannerRow {
  id: string;
  label: string;
  isActive: boolean;
  priority: number;
  startsAt: string | null; // ISO
  endsAt: string | null;
}

interface FormValues {
  id?: string;
  label: string;
  isActive: boolean;
  priority: number;
  startsAt: string | null; // yyyy-mm-dd
  endsAt: string | null;
}

const EMPTY: FormValues = {
  label: '',
  isActive: true,
  priority: 0,
  startsAt: null,
  endsAt: null,
};

export function BannersBoard({ rows }: { rows: BannerRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (row: BannerRow) => {
    setTogglingId(row.id);
    startTransition(async () => {
      const res = await fetch(`/api/admin/banners/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      setTogglingId(null);
      if (res.ok) router.refresh();
    });
  };

  const toFormValues = (r: BannerRow): FormValues => ({
    id: r.id,
    label: r.label,
    isActive: r.isActive,
    priority: r.priority,
    startsAt: r.startsAt ? r.startsAt.slice(0, 10) : null,
    endsAt: r.endsAt ? r.endsAt.slice(0, 10) : null,
  });

  return (
    <section className="glass p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-amber-500" />
        <h3 className="text-xs text-stone-400 uppercase tracking-widest">Step 1 상단 배너</h3>
      </div>
      <p className="text-[11px] text-stone-500 -mt-2">
        활성 배너 중 우선순위 최상위 1개만 고객 Step 1 상단에 노출됩니다. 없으면 숨김. 프로모션과 독립적으로 관리.
      </p>

      {creating ? (
        <BannerForm initial={EMPTY} onCancel={() => setCreating(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="w-full glass-hover p-3 rounded-xl flex items-center justify-center gap-2 text-xs text-stone-300 hover:text-amber-400 touch-target border border-white/5"
        >
          <Plus className="w-3.5 h-3.5" />
          새 배너 추가
        </button>
      )}

      {rows.length === 0 ? (
        <p className="text-stone-600 text-xs text-center py-3">등록된 배너가 없습니다</p>
      ) : (
        <div className="space-y-2">
          {rows.map(row => (
            <div key={row.id}>
              {editing === row.id ? (
                <BannerForm initial={toFormValues(row)} onCancel={() => setEditing(null)} />
              ) : (
                <div className={`${row.isActive ? 'glass-warm' : 'glass'} p-3 rounded-xl flex items-center gap-3`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`badge text-[9px] ${row.isActive ? 'badge-green' : 'badge-warm'}`}>
                        {row.isActive ? '활성' : '비활성'}
                      </span>
                      <span className="text-sm font-medium text-white truncate">{row.label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-stone-500">
                      {row.priority !== 0 && <span>P{row.priority}</span>}
                      {(row.startsAt || row.endsAt) && (
                        <span className="font-mono text-stone-600">
                          {row.startsAt?.slice(0, 10) ?? '...'} ~ {row.endsAt?.slice(0, 10) ?? '...'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => toggle(row)}
                      disabled={isPending}
                      className={`touch-target inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
                        row.isActive
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                          : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                      }`}
                    >
                      {togglingId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                      {row.isActive ? '끄기' : '켜기'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(row.id)}
                      className="touch-target inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-200 hover:bg-white/5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      수정
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BannerForm({
  initial,
  onCancel,
}: {
  initial: FormValues;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [v, setV] = useState<FormValues>(initial);
  const isEdit = !!initial.id;

  const submit = () => {
    setError(null);
    const payload = {
      label: v.label.trim(),
      isActive: v.isActive,
      priority: Number(v.priority) || 0,
      startsAt: v.startsAt || null,
      endsAt: v.endsAt || null,
    };

    startTransition(async () => {
      const url = isEdit ? `/api/admin/banners/${v.id}` : '/api/admin/banners';
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
      onCancel();
      router.refresh();
    });
  };

  const remove = () => {
    if (!v.id) return;
    if (!window.confirm(`배너를 삭제하시겠습니까?\n\n• ${v.label}\n• 되돌릴 수 없습니다.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/banners/${v.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `삭제 실패 (${res.status})`);
        return;
      }
      onCancel();
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl bg-amber-950/15 border border-amber-600/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-amber-300">{isEdit ? '배너 수정' : '새 배너'}</h4>
        <button type="button" onClick={onCancel} className="touch-target w-7 h-7 flex items-center justify-center text-stone-500 hover:text-stone-300">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        <label className="block text-[10px] text-stone-500 uppercase tracking-wider mb-1">문구 (고객 노출)</label>
        <input
          value={v.label}
          onChange={e => setV({ ...v, label: e.target.value })}
          placeholder="예: 봄맞이 특별 할인"
          maxLength={100}
          className="input-dark w-full px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-stone-500 uppercase tracking-wider mb-1">시작일 (비우면 즉시)</label>
          <input
            type="date"
            value={v.startsAt ?? ''}
            onChange={e => setV({ ...v, startsAt: e.target.value || null })}
            className="input-dark w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] text-stone-500 uppercase tracking-wider mb-1">종료일 (비우면 무제한)</label>
          <input
            type="date"
            value={v.endsAt ?? ''}
            onChange={e => setV({ ...v, endsAt: e.target.value || null })}
            className="input-dark w-full px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div>
          <label className="block text-[10px] text-stone-500 uppercase tracking-wider mb-1">우선순위 (클수록 먼저)</label>
          <input
            type="number"
            value={v.priority}
            onChange={e => setV({ ...v, priority: Number(e.target.value) || 0 })}
            className="input-dark w-full px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-stone-400 cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={v.isActive}
            onChange={e => setV({ ...v, isActive: e.target.checked })}
            className="accent-amber-600"
          />
          즉시 활성화
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="btn-primary py-2 px-4 text-xs gap-1.5 disabled:opacity-40"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          저장
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="btn-ghost py-2 px-3 text-xs gap-1.5 text-red-400 hover:text-red-300 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
        )}
      </div>
    </div>
  );
}
