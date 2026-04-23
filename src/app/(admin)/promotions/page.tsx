import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Gift } from 'lucide-react';
import {
  findApplicablePromotion,
  listPromotions,
  toPromotionRule,
} from '../../../../lib/promotions';
import { calculatePrice, type CabinetSize } from '../../../../lib/price';
import { db } from '../../../../db';
import { banners } from '../../../../db/schema';
import { desc } from 'drizzle-orm';
import { PromotionsBoard } from './PromotionsBoard';
import { BannersBoard } from './BannersBoard';

export const dynamic = 'force-dynamic';

const SIZES: CabinetSize[] = ['M', 'L', 'XL'];
const MONTHS = [1, 3, 6, 12];
const SIZE_LABEL: Record<CabinetSize, string> = { M: '소중:함', L: '든든:함', XL: '넉넉:함' };

export default async function PromotionsPage() {
  const [rows, bannerRows] = await Promise.all([
    listPromotions(),
    db.select().from(banners).orderBy(desc(banners.priority), desc(banners.createdAt)),
  ]);

  // 프리뷰: 각 (size, month) 조합에 대해 실제 적용될 가격 계산
  const preview = await Promise.all(
    SIZES.flatMap(size =>
      MONTHS.map(async months => {
        const promo = await findApplicablePromotion(size, months);
        const r = calculatePrice({ cabinetSize: size, months, promotion: toPromotionRule(promo) });
        return { size, months, r, promoName: promo?.name ?? null };
      }),
    ),
  );
  const previewMap = new Map(preview.map(p => [`${p.size}-${p.months}`, p]));

  const boardRows = rows.map(r => ({
    id: r.id,
    name: r.name,
    badgeLabel: r.badgeLabel,
    planLabel: r.planLabel,
    type: r.type,
    isActive: r.isActive,
    priority: r.priority,
    isNewOnly: r.isNewOnly,
    applicableSizes: (r.applicableSizes as string[] | null) ?? null,
    applicableMonths: (r.applicableMonths as number[] | null) ?? null,
    discountRate: r.discountRate,
    freeMonths: r.freeMonths,
    discountAmount: r.discountAmount,
    monthlySchedule: (r.monthlySchedule as { months: number[]; rate: number }[] | null) ?? null,
    startsAt: r.startsAt ? r.startsAt.toISOString() : null,
    endsAt: r.endsAt ? r.endsAt.toISOString() : null,
  }));

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
              프로모션 관리
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        <BannersBoard
          rows={bannerRows.map(b => ({
            id: b.id,
            label: b.label,
            isActive: b.isActive,
            priority: b.priority,
            startsAt: b.startsAt ? b.startsAt.toISOString() : null,
            endsAt: b.endsAt ? b.endsAt.toISOString() : null,
          }))}
        />

        <PromotionsBoard rows={boardRows} />

        {/* Pricing preview — 실제 적용 결과 */}
        <section className="glass p-5">
          <h3 className="text-xs text-stone-500 uppercase tracking-widest mb-1">현재 적용 단가 (실시간)</h3>
          <p className="text-[10px] text-stone-600 mb-4">
            각 셀은 해당 사이즈·개월에 "적용 가능한 활성 프로모션" 을 자동 탐색한 결과입니다. 프로모션이 없으면 장기할인 기본 적용.
          </p>
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
                      const cell = previewMap.get(`${size}-${m}`);
                      if (!cell) return <td key={size}>-</td>;
                      const { r, promoName } = cell;
                      return (
                        <td key={size} className="text-right py-2.5 px-2">
                          <div className="text-white font-medium">₩{r.totalRental.toLocaleString()}</div>
                          <div className="text-[10px] text-stone-600">
                            {r.freeMonths > 0 ? (
                              <>{r.billableMonths}달 결제 · {r.freeMonths}달 무료</>
                            ) : r.discountRate > 0 ? (
                              <>월 ₩{r.monthlyPrice.toLocaleString()} · {Math.round(r.discountRate * 100)}% 할인</>
                            ) : (
                              <>월 ₩{r.monthlyPrice.toLocaleString()}</>
                            )}
                          </div>
                          {promoName && (
                            <div className="text-[9px] text-amber-500/80 truncate" title={promoName}>★ {promoName.replace(/^오픈기념\s*/, '')}</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-stone-600 mt-4">* 보증금 별도 · ★ = 프로모션 적용 중</p>
        </section>
      </div>
    </main>
  );
}
