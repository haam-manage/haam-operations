'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Loader2, X } from 'lucide-react';

interface ContractRow {
  id: string;
  customerName: string;
  cabinetNumber: string;
  startDate: string;
  expiryDate: string;
  months: number;
  rentalAmount: number;
  remark: string | null;
}

function calcExpiry(startDate: string, months: number): string {
  const d = new Date(startDate + 'T00:00:00+09:00');
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function EditButton({ row }: { row: ContractRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(row.months);
  const [expiryDate, setExpiryDate] = useState(row.expiryDate);
  const [additionalPayment, setAdditionalPayment] = useState(0);
  const [rentalAmount, setRentalAmount] = useState(row.rentalAmount);
  const [remarkAppend, setRemarkAppend] = useState('');
  const [sendAlimtalk, setSendAlimtalk] = useState(true);
  const [autoExpiry, setAutoExpiry] = useState(true);
  const [autoRental, setAutoRental] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMonths(row.months);
    setExpiryDate(row.expiryDate);
    setAdditionalPayment(0);
    setRentalAmount(row.rentalAmount);
    setRemarkAppend('');
    setSendAlimtalk(true);
    setAutoExpiry(true);
    setAutoRental(true);
    setError(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const onMonthsChange = (n: number) => {
    setMonths(n);
    if (autoExpiry) setExpiryDate(calcExpiry(row.startDate, n));
  };

  const scheduleChanged = months !== row.months || expiryDate !== row.expiryDate;
  const amountChanged = rentalAmount !== row.rentalAmount;
  const hasChanges = scheduleChanged || amountChanged || remarkAppend.trim().length > 0;

  const onAdditionalPaymentChange = (n: number) => {
    setAdditionalPayment(n);
    if (autoRental) setRentalAmount(row.rentalAmount + n);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      setError('변경 사항이 없습니다');
      return;
    }
    setError(null);
    startTransition(async () => {
      const body: Record<string, unknown> = {};
      if (months !== row.months) body.months = months;
      if (expiryDate !== row.expiryDate) body.expiryDate = expiryDate;
      if (rentalAmount !== row.rentalAmount) body.rentalAmount = rentalAmount;
      if (additionalPayment > 0) body.additionalPaymentAmount = additionalPayment;
      if (remarkAppend.trim()) body.remarkAppend = remarkAppend.trim();
      if (sendAlimtalk && scheduleChanged) body.sendAlimtalk = true;

      const res = await fetch(`/api/admin/contracts/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `수정 실패 (${res.status})`);
        return;
      }
      close();
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="touch-target inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-stone-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
      >
        <Pencil className="w-3 h-3" />
        수정
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[#1c1917] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#1c1917]">
              <div>
                <h3 className="text-sm font-semibold text-white">계약 수정</h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {row.customerName} · {row.cabinetNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="touch-target w-9 h-9 flex items-center justify-center text-stone-500 hover:text-stone-300"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submit} className="p-5 space-y-5">
              {/* months */}
              <div>
                <label className="text-xs text-stone-400 mb-1.5 flex justify-between">
                  <span>계약 개월수</span>
                  {months !== row.months && (
                    <span className="text-amber-400">기존 {row.months}개월</span>
                  )}
                </label>
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={months}
                  onChange={(e) => onMonthsChange(Math.max(1, Math.min(36, Number(e.target.value) || 1)))}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-600/40"
                />
              </div>

              {/* expiry date */}
              <div>
                <label className="text-xs text-stone-400 mb-1.5 flex justify-between items-center">
                  <span>만료일</span>
                  <label className="inline-flex items-center gap-1 text-[11px] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoExpiry}
                      onChange={(e) => {
                        setAutoExpiry(e.target.checked);
                        if (e.target.checked) setExpiryDate(calcExpiry(row.startDate, months));
                      }}
                      className="accent-amber-600 w-3.5 h-3.5"
                    />
                    개월수에 맞춰 자동
                  </label>
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => {
                    setExpiryDate(e.target.value);
                    setAutoExpiry(false);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-600/40 font-mono"
                />
                <p className="text-[10px] text-stone-600 mt-1">
                  시작일 {row.startDate} 기준
                </p>
              </div>

              {/* additional payment */}
              <div>
                <label className="text-xs text-stone-400 mb-1.5 block">
                  추가 결제 금액 (원)
                  <span className="text-[10px] text-stone-600 ml-1">— 알림톡에 표시</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={additionalPayment}
                  onChange={(e) => onAdditionalPaymentChange(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="예: 50000"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white tabular-nums placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-600/40"
                />
                <p className="text-[10px] text-stone-600 mt-1">
                  연장에 대해 별도 결제받은 금액. 0 이면 알림톡에 0원으로 표시됨
                </p>
              </div>

              {/* rental amount */}
              <div>
                <label className="text-xs text-stone-400 mb-1.5 flex justify-between items-center">
                  <span>총 렌탈료 (원)</span>
                  <label className="inline-flex items-center gap-1 text-[11px] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoRental}
                      onChange={(e) => {
                        setAutoRental(e.target.checked);
                        if (e.target.checked) setRentalAmount(row.rentalAmount + additionalPayment);
                      }}
                      className="accent-amber-600 w-3.5 h-3.5"
                    />
                    추가금액 합산 자동
                  </label>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={rentalAmount}
                  onChange={(e) => {
                    setRentalAmount(Math.max(0, Number(e.target.value) || 0));
                    setAutoRental(false);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-600/40"
                />
                <p className="text-[10px] text-stone-600 mt-1">
                  {amountChanged ? (
                    <span className="text-amber-400">
                      기존 ₩{row.rentalAmount.toLocaleString()} → ₩{rentalAmount.toLocaleString()}
                    </span>
                  ) : (
                    <>기존 ₩{row.rentalAmount.toLocaleString()} 유지</>
                  )}
                </p>
              </div>

              {/* remark append */}
              <div>
                <label className="text-xs text-stone-400 mb-1.5 block">비고 추가</label>
                <textarea
                  value={remarkAppend}
                  onChange={(e) => setRemarkAppend(e.target.value)}
                  rows={2}
                  placeholder="예: 고객 요청 1개월 무료 연장"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-600/40 resize-none"
                />
                {row.remark && (
                  <details className="mt-2">
                    <summary className="text-[10px] text-stone-600 cursor-pointer hover:text-stone-400">
                      기존 비고 보기
                    </summary>
                    <pre className="mt-1.5 text-[10px] text-stone-500 whitespace-pre-wrap font-sans bg-white/3 px-2 py-1.5 rounded">
                      {row.remark}
                    </pre>
                  </details>
                )}
                <p className="text-[10px] text-stone-600 mt-1">
                  날짜 prefix 자동 추가 → 기존 비고에 줄바꿈으로 누적
                </p>
              </div>

              {/* alimtalk */}
              {scheduleChanged && (
                <label className="flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
                  <input
                    type="checkbox"
                    checked={sendAlimtalk}
                    onChange={(e) => setSendAlimtalk(e.target.checked)}
                    className="accent-amber-600 w-4 h-4 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-xs text-amber-200 font-medium">고객에게 변경 알림톡 발송</div>
                    <div className="text-[11px] text-amber-200/70 mt-0.5">
                      <div>· 보관함: {row.cabinetNumber}</div>
                      <div>· 기존계약일: {row.startDate}</div>
                      <div>· 기존만료일: {row.expiryDate}</div>
                      <div>· 변경만료일: <span className="text-amber-200 font-medium">{expiryDate}</span></div>
                      <div>· 추가결제금액: <span className="text-amber-200 font-medium">₩{additionalPayment.toLocaleString()}</span></div>
                    </div>
                  </div>
                </label>
              )}

              {error && (
                <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/8 text-sm text-stone-300 transition-colors disabled:opacity-40"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending || !hasChanges}
                  className="flex-1 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:bg-amber-700 inline-flex items-center justify-center gap-1.5"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
