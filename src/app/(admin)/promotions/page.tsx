import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Gift, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { ensureOpeningPromotion, OPENING_PROMO_NAME } from '../../../../lib/promotions';
import { calculatePrice, type CabinetSize } from '../../../../lib/price';
import { ToggleButton } from './ToggleButton';

export const dynamic = 'force-dynamic';

const SIZES: CabinetSize[] = ['M', 'L', 'XL'];
const MONTHS = [1, 3, 6, 12];
const SIZE_LABEL: Record<CabinetSize, string> = { M: '소중:함', L: '든든:함', XL: '넉넉:함' };

export default async function PromotionsPage() {
  const promo = await ensureOpeningPromotion();
  const active = promo.isActive;

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 bg-[#0c0a09]/90 backdrop-blur-lg border-b border-white/5 safe-top">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/dashboard" className="touch-target w-10 h-10 flex items-center justify-center text-stone-500 hover:text-stone-300">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Image src="/images/HAAM_LOGO(S)_001.jpg" alt="HAAM" width={24} height={24} className="rounded-md" />
            <span className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-amber-600" />
              프로모션
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6">
        {/* Status card */}
        <section className={`${active ? 'glass-warm glow-warm' : 'glass'} p-5 mb-4`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-stone-500'}`} />
                <h2 className="text-sm font-semibold text-white">{OPENING_PROMO_NAME}</h2>
              </div>
              <div className="flex items-center gap-1.5">
                {active ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs text-green-300">활성 — 신규 예약에 적용 중</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-stone-500" />
                    <span className="text-xs text-stone-500">비활성 — 장기할인(10/15/20%) 기본 적용</span>
                  </>
                )}
              </div>
            </div>
            <ToggleButton promotionId={promo.id} isActive={active} />
          </div>

          <div className="text-[11px] text-stone-500 leading-relaxed border-t border-white/5 pt-4">
            활성 시: <span className="text-stone-300">1→1개월(15% 할인)</span>
            <span className="mx-1.5 text-stone-700">·</span>
            <span className="text-stone-300">3→2개월 결제 + 1개월 무료</span>
            <span className="mx-1.5 text-stone-700">·</span>
            <span className="text-stone-300">6→4+2</span>
            <span className="mx-1.5 text-stone-700">·</span>
            <span className="text-stone-300">12→8+4</span>
          </div>
        </section>

        {/* Pricing preview */}
        <section className="glass p-5 mb-4">
          <h3 className="text-xs text-stone-500 uppercase tracking-widest mb-4">
            {active ? '현재 적용 단가' : '비활성 시 단가(장기할인)'}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-stone-600">
                  <th className="text-left font-normal pb-2 pr-2">기간</th>
                  {SIZES.map(s => (
                    <th key={s} className="text-right font-normal pb-2 px-2">
                      {s} <span className="text-stone-700">{SIZE_LABEL[s]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {MONTHS.map(m => (
                  <tr key={m}>
                    <td className="py-2.5 pr-2 text-stone-400">{m}개월</td>
                    {SIZES.map(size => {
                      const r = calculatePrice({ cabinetSize: size, months: m, promotionActive: active });
                      return (
                        <td key={size} className="text-right py-2.5 px-2">
                          <div className="text-white font-medium">₩{r.totalRental.toLocaleString()}</div>
                          <div className="text-[10px] text-stone-600">
                            {r.freeMonths > 0 ? (
                              <>{r.billableMonths}달 결제 · {r.freeMonths}달 무료</>
                            ) : (
                              <>월 ₩{r.monthlyPrice.toLocaleString()}{r.discountRate > 0 && ` · ${Math.round(r.discountRate * 100)}% 할인`}</>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-stone-600 mt-4">* 보증금은 별도 — 렌탈료 합계만 표시</p>
        </section>

        <p className="text-[11px] text-stone-600 text-center">
          현재는 "오픈기념 프로모션" 단일 토글만 지원합니다. 추가 프로모션 타입은 필요 시 확장.
        </p>
      </div>
    </main>
  );
}
