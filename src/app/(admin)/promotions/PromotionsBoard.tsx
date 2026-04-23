'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Loader2, Power, Calendar, Tag, Percent, Gift as GiftIcon, Banknote, LayoutList, Trash2, Copy } from 'lucide-react';
import { PromotionForm, type PromotionFormValues, type PromotionType, type ScheduleEntry } from './PromotionForm';

interface Row {
  id: string;
  name: string;
  type: PromotionType;
  isActive: boolean;
  priority: number;
  isNewOnly: boolean;
  applicableSizes: string[] | null;
  applicableMonths: number[] | null;
  discountRate: string | null;
  freeMonths: number | null;
  discountAmount: number | null;
  monthlySchedule: ScheduleEntry[] | null;
  startsAt: string | null;
  endsAt: string | null;
}

const TYPE_ICON: Record<PromotionType, React.ReactNode> = {
  discount_rate: <Percent className="w-3.5 h-3.5" />,
  free_months: <GiftIcon className="w-3.5 h-3.5" />,
  fixed_discount: <Banknote className="w-3.5 h-3.5" />,
  per_month_schedule: <LayoutList className="w-3.5 h-3.5" />,
};

const TYPE_LABEL: Record<PromotionType, string> = {
  discount_rate: '할인율',
  free_months: '무료개월',
  fixed_discount: '금액할인',
  per_month_schedule: '월별구간',
};

export function PromotionsBoard({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState<boolean | PromotionFormValues>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allIds = useMemo(() => rows.map(r => r.id), [rows]);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const bulkDelete = () => {
    if (selected.size === 0) return;
    const names = rows.filter(r => selected.has(r.id)).map(r => `• ${r.name}`).join('\n');
    if (!window.confirm(`선택한 ${selected.size}개 프로모션을 삭제하시겠습니까?\n\n${names}\n\n되돌릴 수 없습니다.`)) return;
    setBulkDeleting(true);
    startTransition(async () => {
      const ids = Array.from(selected);
      const results = await Promise.all(
        ids.map(id =>
          fetch(`/api/admin/promotions/${id}`, { method: 'DELETE' })
            .then(res => ({ id, ok: res.ok }))
            .catch(() => ({ id, ok: false })),
        ),
      );
      setBulkDeleting(false);
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        alert(`${failed.length}개 삭제 실패. 다시 시도해주세요.`);
      }
      setSelected(new Set(failed.map(f => f.id)));
      router.refresh();
    });
  };

  const toggle = (row: Row) => {
    setTogglingId(row.id);
    startTransition(async () => {
      const res = await fetch(`/api/admin/promotions/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      setTogglingId(null);
      if (res.ok) router.refresh();
    });
  };

  const toFormValues = (r: Row): PromotionFormValues => ({
    id: r.id,
    name: r.name,
    type: r.type,
    isActive: r.isActive,
    priority: r.priority,
    isNewOnly: r.isNewOnly,
    applicableSizes: r.applicableSizes,
    applicableMonths: r.applicableMonths,
    discountRate: r.discountRate,
    freeMonths: r.freeMonths,
    discountAmount: r.discountAmount,
    monthlySchedule: r.monthlySchedule,
    startsAt: r.startsAt ? r.startsAt.slice(0, 10) : null,
    endsAt: r.endsAt ? r.endsAt.slice(0, 10) : null,
  });

  const clone = (row: Row) => {
    setEditing(null);
    setCreating({
      ...toFormValues(row),
      id: undefined,
      name: `${row.name} (복사본)`,
      isActive: false,
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Create */}
      {creating ? (
        <PromotionForm
          initial={typeof creating === 'object' ? creating : undefined}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="w-full glass glass-hover p-4 flex items-center justify-center gap-2 text-sm text-stone-300 hover:text-amber-400 touch-target"
        >
          <Plus className="w-4 h-4" />
          새 프로모션 추가
        </button>
      )}

      {/* Bulk toolbar */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-1">
          <label className="inline-flex items-center gap-2 text-xs text-stone-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="accent-amber-600 w-4 h-4"
            />
            전체 선택 {someSelected && <span className="text-amber-400">({selected.size})</span>}
          </label>
          {someSelected && (
            <button
              type="button"
              onClick={bulkDelete}
              disabled={isPending || bulkDeleting}
              className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40"
            >
              {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              선택한 {selected.size}개 삭제
            </button>
          )}
        </div>
      )}

      {/* List */}
      {rows.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="text-stone-500 text-sm">등록된 프로모션이 없습니다</p>
        </div>
      ) : (
        rows.map(row => (
          <div key={row.id}>
            {editing === row.id ? (
              <PromotionForm initial={toFormValues(row)} onCancel={() => setEditing(null)} />
            ) : (
              <div className={`${row.isActive ? 'glass-warm glow-warm' : 'glass'} p-4`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    className="accent-amber-600 w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                    aria-label={`${row.name} 선택`}
                  />
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge text-[9px] ${row.isActive ? 'badge-green' : 'badge-warm'}`}>
                        {row.isActive ? '활성' : '비활성'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-stone-500 uppercase tracking-wider">
                        {TYPE_ICON[row.type]}
                        {TYPE_LABEL[row.type]}
                      </span>
                      <span className="text-sm font-medium text-white truncate">{row.name}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
                      <ValueDisplay row={row} />
                      {row.applicableSizes && (
                        <span className="inline-flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {row.applicableSizes.join('/')}
                        </span>
                      )}
                      {row.applicableMonths && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {row.applicableMonths.join(',')}개월
                        </span>
                      )}
                      {(row.startsAt || row.endsAt) && (
                        <span className="font-mono text-stone-600">
                          {row.startsAt?.slice(0, 10) ?? '...'} ~ {row.endsAt?.slice(0, 10) ?? '...'}
                        </span>
                      )}
                      {row.priority !== 0 && (
                        <span className="text-stone-600">P{row.priority}</span>
                      )}
                      {row.isNewOnly && <span className="text-amber-500">신규만</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => toggle(row)}
                      disabled={isPending}
                      className={`touch-target inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
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
                      className="touch-target inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-200 hover:bg-white/5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => clone(row)}
                      title="복제"
                      aria-label="복제"
                      className="touch-target inline-flex items-center justify-center w-9 h-9 rounded-lg text-stone-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function ValueDisplay({ row }: { row: Row }) {
  if (row.type === 'discount_rate' && row.discountRate) {
    return <span className="text-stone-300">{Math.round(Number(row.discountRate) * 100)}% 할인</span>;
  }
  if (row.type === 'free_months' && row.freeMonths !== null) {
    return <span className="text-stone-300">{row.freeMonths}개월 무료</span>;
  }
  if (row.type === 'fixed_discount' && row.discountAmount !== null) {
    return <span className="text-stone-300">₩{row.discountAmount.toLocaleString()} 할인</span>;
  }
  if (row.type === 'per_month_schedule' && row.monthlySchedule) {
    return (
      <span className="text-stone-300">
        {row.monthlySchedule
          .map(e => `${formatMonthsRange(e.months)}=${Math.round(e.rate * 100)}%`)
          .join(' · ')}
      </span>
    );
  }
  return null;
}

function formatMonthsRange(months: number[]): string {
  if (months.length === 0) return '';
  const sorted = [...months].sort((a, b) => a - b);
  const groups: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) { prev = sorted[i]; continue; }
    groups.push(start === prev ? `${start}` : `${start}~${prev}`);
    start = sorted[i]; prev = sorted[i];
  }
  groups.push(start === prev ? `${start}` : `${start}~${prev}`);
  return groups.join(',') + '달';
}
