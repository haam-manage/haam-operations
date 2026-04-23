'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check, CreditCard, Lock, ChevronRight, Package, Calendar, Mail, Minus, Plus, ShieldCheck, Gift, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';
import { StepLayout } from '../../../components/StepLayout';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { calculatePrice, type CabinetSize, type PriceResult, type PromotionRule, type PromotionType } from '../../../../lib/price';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface ActivePromotion {
  id: string;
  name: string;
  badgeLabel: string | null;
  planLabel: string | null;
  type: PromotionType;
  priority: number;
  applicableSizes: CabinetSize[] | null;
  applicableMonths: number[] | null;
  discountRate: string | null;
  freeMonths: number | null;
  discountAmount: number | null;
  monthlySchedule: { months: number[]; rate: number }[] | null;
}

interface SizeDiscountPreview {
  maxRate: number;
  badge: string;
  promoName: string;
}

/**
 * 사이즈별 "최대 할인율" 과 대표 뱃지 텍스트를 뽑는다.
 * - 같은 사이즈에 적용 가능한 모든 활성 프로모션을 훑고
 * - 월 기준 최대 할인율(%)을 기록
 * - 해당 할인율을 만드는 구간을 뱃지에 반영 (예: "첫 1개월 50%")
 */
function getBestDiscountForSize(size: CabinetSize, promos: ActivePromotion[]): SizeDiscountPreview | null {
  let best: { rate: number; badge: string; promoName: string } | null = null;

  for (const p of promos) {
    if (p.applicableSizes && !p.applicableSizes.includes(size)) continue;

    // 관리자가 badgeLabel 을 채웠으면 자동 생성 대신 그 문구를 사용
    const override = p.badgeLabel?.trim() || null;
    const candidates: { rate: number; badge: string }[] = [];

    if (p.type === 'discount_rate') {
      const r = Number(p.discountRate);
      if (Number.isFinite(r) && r > 0) {
        candidates.push({ rate: r, badge: override ?? `전 기간 ${Math.round(r * 100)}%` });
      }
    } else if (p.type === 'per_month_schedule' && Array.isArray(p.monthlySchedule)) {
      for (const e of p.monthlySchedule) {
        if (Number.isFinite(e.rate) && e.rate > 0 && Array.isArray(e.months) && e.months.length > 0) {
          candidates.push({ rate: e.rate, badge: override ?? formatScheduleBadge(e.months, e.rate) });
        }
      }
    } else if (p.type === 'free_months' && p.freeMonths && p.freeMonths > 0) {
      const spans = p.applicableMonths && p.applicableMonths.length > 0 ? p.applicableMonths : [12];
      const m = Math.max(...spans);
      if (m > 0 && p.freeMonths < m) {
        candidates.push({ rate: p.freeMonths / m, badge: override ?? `${m}개월 약정 시 ${p.freeMonths}달 무료` });
      }
    }

    for (const c of candidates) {
      if (!best || c.rate > best.rate) {
        best = { rate: c.rate, badge: c.badge, promoName: p.name };
      }
    }
  }

  return best ? { maxRate: best.rate, badge: best.badge, promoName: best.promoName } : null;
}

function formatScheduleBadge(months: number[], rate: number): string {
  const sorted = [...months].sort((a, b) => a - b);
  const pct = Math.round(rate * 100);
  const groups: string[] = [];
  let s = sorted[0];
  let e = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === e + 1) { e = sorted[i]; continue; }
    groups.push(s === e ? `${s}` : `${s}~${e}`);
    s = sorted[i]; e = sorted[i];
  }
  groups.push(s === e ? `${s}` : `${s}~${e}`);
  return `${groups.join(',')}개월 ${pct}%`;
}

function findPromoFor(size: CabinetSize, months: number, promos: ActivePromotion[]): ActivePromotion | null {
  for (const p of promos) {
    const sizeOk = !p.applicableSizes || p.applicableSizes.includes(size);
    const monthsOk = !p.applicableMonths || p.applicableMonths.includes(months);
    if (sizeOk && monthsOk) return p;
  }
  return null;
}

function toPromotionRule(p: ActivePromotion): PromotionRule {
  return {
    type: p.type,
    discountRate: p.discountRate,
    freeMonths: p.freeMonths,
    discountAmount: p.discountAmount,
    monthlySchedule: p.monthlySchedule,
  };
}

function findRuleFor(size: CabinetSize, months: number, promos: ActivePromotion[]): PromotionRule | null {
  const p = findPromoFor(size, months, promos);
  return p ? toPromotionRule(p) : null;
}

interface PriceBreakdown {
  basePrice: number;
  monthlyPrice: number;
  billableMonths: number;
  freeMonths: number;
  totalRental: number;
  deposit: number;
  totalAmount: number;
  discountRate: number;
}

interface BookingClientProps {
  customerId: string;
  name: string;
  phone: string;
  email: string | null;
}

const SIZE_INFO: Record<string, { name: string; price: number; deposit: number; maxUsers: number; image: string; dimension: string; desc: string }> = {
  M:  { name: '소중:함', price: 70_000, deposit: 70_000, maxUsers: 2, image: '/images/3.png', dimension: '100 × 100 × 110cm', desc: '겨울 옷, 캠핑 장비, 스포츠 용품' },
  L:  { name: '든든:함', price: 120_000, deposit: 120_000, maxUsers: 3, image: '/images/6.png', dimension: '90 × 110 × 220cm', desc: '사계절 의류, 골프백, 여행 가방' },
  XL: { name: '넉넉:함', price: 200_000, deposit: 200_000, maxUsers: 4, image: '/images/5.png', dimension: '200 × 100 × 220cm', desc: '대형 스포츠 장비, 이불, 가전제품' },
};

const MIN_MONTHS = 1;
const MAX_MONTHS = 12;

export function BookingClient({ customerId, name, phone, email: initialEmail }: BookingClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [selectedSize, setSelectedSize] = useState<CabinetSize | null>(null);
  const [selectedCabinet, setSelectedCabinet] = useState('');
  const [months, setMonths] = useState(1);
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [email, setEmail] = useState(initialEmail ?? '');
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [widgetsReady, setWidgetsReady] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderId: string; orderName: string } | null>(null);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [activePromos, setActivePromos] = useState<ActivePromotion[]>([]);
  const [activeBanner, setActiveBanner] = useState<{ id: string; label: string } | null>(null);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);

  useEffect(() => {
    fetch('/api/cabinets')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.cabinets) return;
        const map: Record<string, boolean> = {};
        for (const c of data.cabinets as { number: string; isAvailable: boolean }[]) {
          map[c.number] = c.isAvailable;
        }
        setAvailability(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/promotions/active')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.promotions) return;
        setActivePromos(data.promotions as ActivePromotion[]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/banner/active')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.banner) setActiveBanner(data.banner as { id: string; label: string });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step !== 5) return;
    if (!priceBreakdown || !orderResult) return;
    if (widgetsRef.current) return;

    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      toast.error('결제 모듈 설정이 누락되었습니다');
      return;
    }

    let cancelled = false;
    (async () => {
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(clientKey);
      if (cancelled) return;

      // StepLayout 의 AnimatePresence exit 애니메이션이 끝나기 전에 effect 가 먼저 발화하면
      // 마운트 targets(#toss-payment-methods/#toss-agreement) 가 아직 DOM 에 없음.
      // 요소가 나타날 때까지 rAF 로 대기 (최대 ~500ms).
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const check = () => {
          if (cancelled) return resolve();
          if (
            document.getElementById('toss-payment-methods') &&
            document.getElementById('toss-agreement')
          ) return resolve();
          if (++attempts > 30) return reject(new Error('결제 위젯 DOM 마운트 대기 시간 초과'));
          requestAnimationFrame(check);
        };
        check();
      });
      if (cancelled) return;

      const widgets = tossPayments.widgets({ customerKey: customerId });
      await widgets.setAmount({ currency: 'KRW', value: priceBreakdown.totalAmount });
      await Promise.all([
        widgets.renderPaymentMethods({ selector: '#toss-payment-methods' }),
        widgets.renderAgreement({ selector: '#toss-agreement' }),
      ]);
      if (cancelled) return;

      widgetsRef.current = widgets;
      setWidgetsReady(true);
    })().catch((err) => {
      const detail = err instanceof Error
        ? `${err.name}: ${err.message}`
        : String(err);
      console.error('[Toss widgets] 초기화 실패', { detail, err });
      if (!cancelled) toast.error(`결제 위젯 로드 실패 — ${detail}`);
    });

    return () => { cancelled = true; };
  }, [step, priceBreakdown, orderResult, customerId]);

  const goTo = useCallback((s: Step, dir: 'forward' | 'back' = 'forward') => {
    setDirection(dir);
    setStep(s);
  }, []);

  const haptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const estimate: PriceResult | null = selectedSize
    ? calculatePrice({ cabinetSize: selectedSize, months, promotion: findRuleFor(selectedSize, months, activePromos) })
    : null;
  const endDate = calculateEndDate(startDate, months);

  // ─── Step 1: Size Selection ───
  if (step === 1) {
    // 배너는 banners 테이블의 활성 1건을 그대로 노출. 프로모션과 독립.
    return (
      <StepLayout
        step={1} totalSteps={6}
        title="어떤 크기가 필요하세요?"
        subtitle="Step 1 · 사이즈"
        onHome={() => router.push('/')}
        bottomCTA={
          <Button
            variant="primary"
            className="w-full py-4 text-base"
            disabled={!selectedSize}
            onClick={() => goTo(2)}
          >
            다음
            <ChevronRight className="w-5 h-5" />
          </Button>
        }
      >
        {/* Promo Hero Banner — banners 테이블에서 온 시즌 메시지 1건 */}
        {activeBanner && (
          <div className="mb-5 relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/60 via-stone-950/80 to-orange-950/40 p-4 animate-fade-in">
            <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-orange-500/15 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/40 shrink-0">
                <Gift className="w-5 h-5 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="relative inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-black text-[8px] font-extrabold tracking-wider">
                    <span className="w-1 h-1 rounded-full bg-red-600 animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-amber-400/80">
                    진행중인 혜택
                  </span>
                </div>
                <div className="text-sm font-bold text-white truncate">
                  {activeBanner.label}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {(['M', 'L', 'XL'] as CabinetSize[]).map(size => {
            const info = SIZE_INFO[size];
            const selected = selectedSize === size;
            const discount = getBestDiscountForSize(size, activePromos);
            const discountedPrice = discount ? Math.round(info.price * (1 - discount.maxRate)) : null;

            return (
              <button
                key={size}
                onClick={() => { setSelectedSize(size); setSelectedCabinet(''); haptic(); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 text-left active:scale-[0.98] ${
                  selected ? 'glass-warm glow-warm' : 'glass'
                }`}
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative">
                  <Image src={info.image} alt={size} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{info.name}</span>
                    <span className="text-xs text-stone-600">{size}</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mb-1">{info.desc}</p>

                  {discount && discountedPrice !== null ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] text-stone-600 line-through tabular-nums">
                        ₩{info.price.toLocaleString()}
                      </span>
                      <span className="text-base font-bold gradient-text-warm tabular-nums">
                        ₩{discountedPrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-amber-500/80">/월부터</span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-white tabular-nums">월 ₩{info.price.toLocaleString()}</p>
                  )}

                  {discount && (
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-[10px] font-medium text-amber-300">
                      <Sparkles className="w-2.5 h-2.5" />
                      {discount.badge}
                    </div>
                  )}
                </div>
                {selected && (
                  <div className="w-7 h-7 rounded-full bg-amber-700 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 전체 가격표 — 기간 × 사이즈 풀 조합 */}
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500">전체 가격표</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[56px_1fr_1fr_1fr] bg-white/[0.03] border-b border-white/5">
              <div className="px-1.5 py-2 text-[9px] uppercase tracking-wider text-stone-500 font-medium text-center">기간</div>
              {(['M', 'L', 'XL'] as CabinetSize[]).map(size => (
                <div key={size} className="px-1.5 py-2 text-center border-l border-white/5">
                  <div className="text-[10px] text-stone-400 font-semibold">
                    <span className="text-amber-400">{size}</span> {SIZE_INFO[size].name}
                  </div>
                </div>
              ))}
            </div>

            {/* Body rows */}
            {[1, 3, 6, 12].map(m => (
              <div
                key={m}
                className="grid grid-cols-[56px_1fr_1fr_1fr] border-b border-white/5 last:border-b-0"
              >
                <div className="px-1.5 py-2.5 flex items-center justify-center text-[11px] font-semibold text-white whitespace-nowrap">
                  {m}개월
                </div>
                {(['M', 'L', 'XL'] as CabinetSize[]).map(size => {
                  const promo = findPromoFor(size, m, activePromos);
                  const rule = promo ? toPromotionRule(promo) : null;
                  const p = calculatePrice({ cabinetSize: size, months: m, promotion: rule });
                  const discountPct = Math.round(p.discountRate * 100);
                  const segments = buildRentalSegments(size, m, rule);
                  const showBreakdown = m >= 3 && segments.length >= 2;
                  return (
                    <div
                      key={size}
                      className={`px-2 py-3 border-l border-white/5 text-center ${promo ? 'bg-amber-500/[0.05]' : ''}`}
                    >
                      <div className="text-[13px] font-bold text-white tabular-nums leading-tight">
                        ₩{p.totalRental.toLocaleString()}
                      </div>
                      {showBreakdown ? (
                        <div className="mt-1 space-y-0.5">
                          {segments.map((seg, idx) => {
                            const segPct = Math.round(seg.rate * 100);
                            const rateText = seg.free ? '무료' : segPct > 0 ? `${segPct}%` : '';
                            const colorCls = seg.free
                              ? 'text-green-400'
                              : segPct > 0
                                ? 'text-amber-400/90 font-medium'
                                : 'text-stone-400';
                            return (
                              <div key={`${seg.start}-${seg.end}`} className={`text-[10px] leading-tight tabular-nums ${colorCls}`}>
                                {idx > 0 && '+ '}
                                {segmentLabel(seg.start, seg.end)}
                                {rateText && ` ${rateText}`}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[10px] leading-tight mt-1 tabular-nums">
                          {discountPct > 0 ? (
                            <span className="text-amber-400/90 font-medium">{discountPct}% 할인</span>
                          ) : (
                            <span className="text-stone-500">월 ₩{p.monthlyPrice.toLocaleString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="px-3 py-2.5 text-[10px] text-stone-500 bg-white/[0.02] border-t border-white/5 text-right">
              * 모든 금액은 보증금 별도
            </div>
          </div>
        </div>
      </StepLayout>
    );
  }

  // ─── Step 2: Cabinet Number ───
  if (step === 2) {
    const activeSize: CabinetSize = selectedSize ?? 'M';
    const nums = getCabinetNumbers(activeSize);
    const availableCount = nums.filter(n => availability[n] !== false).length;

    const switchSize = (size: CabinetSize) => {
      if (size === selectedSize) return;
      setSelectedSize(size);
      setSelectedCabinet('');
      haptic();
    };

    return (
      <StepLayout
        step={2} totalSteps={6}
        title="보관함을 선택하세요"
        subtitle="Step 2 · 보관함"
        onBack={() => goTo(1, 'back')}
        direction={direction}
        bottomCTA={
          <Button variant="primary" className="w-full py-4 text-base" disabled={!selectedCabinet} onClick={() => goTo(3)}>
            {selectedCabinet ? `${selectedCabinet} 선택 · 다음` : '보관함을 고르세요'}
            <ChevronRight className="w-5 h-5" />
          </Button>
        }
      >
        {/* 사이즈 필터 탭 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['M', 'L', 'XL'] as CabinetSize[]).map(size => {
            const total = size === 'M' ? 46 : size === 'L' ? 13 : 2;
            const available = getCabinetNumbers(size).filter(n => availability[n] !== false).length;
            const active = activeSize === size;
            return (
              <button
                key={size}
                onClick={() => switchSize(size)}
                className={`py-3 rounded-xl text-center transition-all duration-150 touch-target ${
                  active
                    ? 'bg-amber-900/30 border border-amber-700/40 text-amber-400'
                    : 'bg-white/3 border border-white/5 text-stone-400 active:bg-white/6'
                }`}
              >
                <div className="text-sm font-bold">{SIZE_INFO[size].name}</div>
                <div className={`text-[10px] mt-0.5 ${active ? 'text-amber-500/80' : 'text-stone-600'}`}>
                  {size} · {available}/{total}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-stone-500 mb-3">
          남은 보관함 <span className="text-amber-500 font-semibold">{availableCount}</span>/{nums.length}
        </p>

        {/* 확대 3열 그리드 — 터치 타깃 48px+ */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {nums.map(num => {
            const isTaken = availability[num] === false;
            const isSel = selectedCabinet === num;
            return (
              <button
                key={num}
                disabled={isTaken}
                onClick={() => { setSelectedCabinet(num); haptic(); }}
                className={`py-4 rounded-xl text-base font-mono font-semibold transition-all duration-150 min-h-[56px] ${
                  isSel
                    ? 'bg-amber-600 text-black shadow-[0_0_0_2px_rgba(251,191,36,0.4)]'
                    : isTaken
                      ? 'bg-stone-800/60 text-stone-600 cursor-not-allowed line-through'
                      : 'bg-green-900/30 border border-green-800/30 text-green-400 active:bg-green-900/50'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex justify-around text-[11px] text-stone-500 mb-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-900/60 border border-green-800/40" />가능
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-stone-800" />사용중
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-600" />선택
          </span>
        </div>
      </StepLayout>
    );
  }

  // ─── Step 3: Duration + Date ───
  if (step === 3) {
    const dec = () => { if (months > MIN_MONTHS) { setMonths(months - 1); haptic(); } };
    const inc = () => { if (months < MAX_MONTHS) { setMonths(months + 1); haptic(); } };
    const step3Promo = selectedSize ? findPromoFor(selectedSize, months, activePromos) : null;
    const step3Rule = step3Promo ? toPromotionRule(step3Promo) : null;
    const promoBreakdown = describePromotionPlan(step3Rule, months, step3Promo?.planLabel);
    // 프로모션 rule 이 있으면 조합 문구, 없으면 장기할인 blended rate fallback.
    const discountLabel = promoBreakdown || (estimate ? describeDiscount(estimate) : '');

    return (
      <StepLayout
        step={3} totalSteps={6}
        title="기간을 선택하세요"
        subtitle="Step 3 · 기간"
        onBack={() => goTo(2, 'back')}
        direction={direction}
        bottomCTA={
          <Button variant="primary" className="w-full py-4 text-base" onClick={() => goTo(4)}>
            {estimate ? (
              <span>₩{estimate.totalAmount.toLocaleString()} · 다음</span>
            ) : (
              <span>다음</span>
            )}
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Months spinner */}
          <div className="glass p-5">
            <div className="flex items-center justify-between">
              <button
                onClick={dec}
                disabled={months <= MIN_MONTHS}
                aria-label="개월 감소"
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  months <= MIN_MONTHS
                    ? 'bg-stone-800/40 text-stone-700 cursor-not-allowed'
                    : 'bg-amber-900/30 border border-amber-700/40 text-amber-400 active:bg-amber-900/50'
                }`}
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="text-center">
                <div className="text-4xl font-bold text-white tabular-nums">{months}</div>
                <div className="text-xs text-stone-500 mt-0.5">개월</div>
              </div>
              <button
                onClick={inc}
                disabled={months >= MAX_MONTHS}
                aria-label="개월 증가"
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  months >= MAX_MONTHS
                    ? 'bg-stone-800/40 text-stone-700 cursor-not-allowed'
                    : 'bg-amber-900/30 border border-amber-700/40 text-amber-400 active:bg-amber-900/50'
                }`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {discountLabel && (
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-500 bg-amber-900/20 border border-amber-700/30 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {discountLabel}
                </span>
              </div>
            )}
          </div>

          {/* Start / End date */}
          <div>
            <label className="text-xs text-stone-500 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              시작일
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              min={getDefaultStartDate()}
              className="input-dark"
            />
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-stone-500">종료일</span>
              <span className="text-white font-medium tabular-nums">{endDate}</span>
            </div>
          </div>

          {/* Price preview — 월별 상세 */}
          {estimate && selectedSize && (
            <div className="glass-warm p-4 space-y-3">
              {/* 총액 */}
              <div className="flex justify-between items-center pb-3 border-b border-amber-500/15">
                <span className="text-sm text-stone-400">예상 결제금액</span>
                <span className="text-xl font-bold gradient-text-warm tabular-nums">₩{estimate.totalAmount.toLocaleString()}</span>
              </div>

              {/* 할인 구간별 렌탈료 */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500 mb-2">할인 구간</div>
                <div className="space-y-1.5">
                  {buildRentalSegments(selectedSize, months, step3Rule).map(seg => {
                    const pct = Math.round(seg.rate * 100);
                    const segLength = seg.end - seg.start + 1;
                    const segTotal = seg.monthlyAmount * segLength;
                    return (
                      <div key={`${seg.start}-${seg.end}`} className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-stone-400 truncate">{segmentLabel(seg.start, seg.end)}</span>
                          {seg.free ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-green-500/15 text-green-300 text-[10px] font-semibold shrink-0">무료</span>
                          ) : pct > 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-semibold shrink-0">{pct}% 할인</span>
                          ) : null}
                        </span>
                        <span className={`tabular-nums shrink-0 ${seg.free ? 'text-green-400' : 'text-stone-200'}`}>
                          {segLength === 1
                            ? `월 ₩${seg.monthlyAmount.toLocaleString()}`
                            : `₩${segTotal.toLocaleString()}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 합계 + 보증금 */}
              <div className="pt-2 border-t border-amber-500/15 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-400">렌탈료 합계</span>
                  <span className="text-stone-200 tabular-nums">₩{estimate.totalRental.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">보증금 <span className="text-stone-600">(환급)</span></span>
                  <span className="text-stone-400 tabular-nums">₩{estimate.deposit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </StepLayout>
    );
  }

  // ─── Step 4: Review (auth prefilled) ───
  if (step === 4) {
    return (
      <StepLayout
        step={4} totalSteps={6}
        title="결제 정보를 확인하세요"
        subtitle="Step 4 · 확인"
        onBack={() => goTo(3, 'back')}
        direction={direction}
        bottomCTA={
          <Button
            variant="primary"
            className="w-full py-4 text-base"
            loading={isSubmitting}
            onClick={handleSubmitOrder}
          >
            <CreditCard className="w-5 h-5" />
            결제하기
          </Button>
        }
      >
        <div className="space-y-5">
          {/* 인증된 예약자 badge */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-green-900/20 border border-green-700/30">
            <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-green-500/80 mb-0.5">본인 인증 완료</div>
              <div className="text-sm text-white truncate">
                <span className="font-medium">{name}</span>
                <span className="text-stone-500 mx-1.5">·</span>
                <span className="text-stone-300 tabular-nums">{formatPhoneDisplay(phone)}</span>
              </div>
            </div>
          </div>

          {/* 이메일 (선택) */}
          <Input
            label="이메일 (선택) · 영수증 수신용"
            icon={<Mail className="w-3.5 h-3.5" />}
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          {/* 주문 요약 */}
          {estimate && selectedSize && (
            <div className="glass p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-white">{selectedCabinet} · {SIZE_INFO[selectedSize].name}</p>
                  <p className="text-xs text-stone-500">{SIZE_INFO[selectedSize].dimension}</p>
                </div>
              </div>
              <div className="divider" />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-stone-400">
                  <span>시작일</span>
                  <span className="text-white tabular-nums">{startDate}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>종료일</span>
                  <span className="text-white tabular-nums">{endDate}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>기간</span>
                  <span className="text-white">
                    {months}개월{estimate.freeMonths > 0 ? ` (${estimate.billableMonths}+${estimate.freeMonths}무료)` : ''}
                  </span>
                </div>
              </div>
              <div className="divider" />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-stone-400">
                  <span>렌탈료</span>
                  <span className="text-stone-300 tabular-nums">₩{estimate.totalRental.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>보증금</span>
                  <span className="text-stone-300 tabular-nums">₩{estimate.deposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1">
                  <span className="text-white">예상 결제금액</span>
                  <span className="gradient-text-warm tabular-nums">₩{estimate.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </StepLayout>
    );
  }

  // ─── Step 5: Payment (Toss Widget) ───
  if (step === 5) {
    const backToReview = () => {
      widgetsRef.current = null;
      setWidgetsReady(false);
      goTo(4, 'back');
    };
    return (
      <StepLayout
        step={5} totalSteps={6}
        title="결제"
        subtitle="Step 5 · 결제"
        onBack={backToReview}
        direction={direction}
        bottomCTA={
          <Button
            variant="primary"
            className="w-full py-4 text-base"
            disabled={!widgetsReady || isPaying}
            loading={isPaying}
            onClick={handleRequestPayment}
          >
            <CreditCard className="w-5 h-5" />
            {priceBreakdown
              ? `₩${priceBreakdown.totalAmount.toLocaleString()} 결제`
              : '결제'}
          </Button>
        }
      >
        {priceBreakdown && (
          <div className="glass p-5 mb-4 space-y-3 text-sm">
            <div className="flex justify-between text-stone-400">
              <span>렌탈료</span>
              <span>₩{priceBreakdown.totalRental.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>보증금</span>
              <span>₩{priceBreakdown.deposit.toLocaleString()}</span>
            </div>
            <div className="divider" />
            <div className="flex justify-between text-lg font-bold">
              <span className="text-white">총 결제금액</span>
              <span className="gradient-text-warm">₩{priceBreakdown.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div id="toss-payment-methods" className="mb-3" />
        <div id="toss-agreement" />

        {!widgetsReady && (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-amber-600/30 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-xs text-stone-500 mt-2">결제 위젯 로딩 중…</p>
          </div>
        )}

        {orderResult && (
          <p className="text-[10px] text-stone-700 mt-4 font-mono text-center">{orderResult.orderId}</p>
        )}
      </StepLayout>
    );
  }

  // ─── Step 6: Complete ───
  return (
    <StepLayout step={6} totalSteps={6} title="" direction={direction}>
      <div className="text-center py-8 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/15 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">예약 완료!</h2>
        <p className="text-stone-400 text-sm mb-8">카카오톡으로 보안코드가 발송됩니다.</p>
        <div className="glass p-5 inline-flex items-center gap-2 text-sm text-stone-400">
          <Lock className="w-4 h-4 text-amber-600" />
          마이페이지에서도 보안코드를 확인할 수 있습니다
        </div>
      </div>
    </StepLayout>
  );

  async function handleSubmitOrder() {
    if (!selectedCabinet || !selectedSize) {
      toast.error('보관함을 선택해 주세요');
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email: email || undefined,
          cabinetNumber: selectedCabinet,
          months,
          startDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || '주문 생성에 실패했습니다');
        return;
      }

      setPriceBreakdown(data.priceBreakdown);
      setOrderResult({ orderId: data.orderId, orderName: data.orderName });
      goTo(5);
    } catch {
      toast.error('네트워크 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestPayment() {
    const widgets = widgetsRef.current;
    if (!widgets || !orderResult) {
      toast.error('결제 위젯이 아직 준비되지 않았습니다');
      return;
    }
    setIsPaying(true);
    try {
      await widgets.requestPayment({
        orderId: orderResult.orderId,
        orderName: orderResult.orderName,
        successUrl: `${window.location.origin}/booking/success`,
        failUrl: `${window.location.origin}/booking/fail`,
        customerEmail: email || undefined,
        customerName: name,
        customerMobilePhone: phone.replace(/\D/g, ''),
      });
      // requestPayment 는 리다이렉트를 트리거하므로 이 지점 이후는 사실상 도달하지 않음.
    } catch (err) {
      console.error('[Toss requestPayment]', err);
      toast.error(err instanceof Error ? err.message : '결제 요청에 실패했습니다');
    } finally {
      setIsPaying(false);
    }
  }
}

/* ─── Helpers ─── */

function getCabinetNumbers(size: CabinetSize): string[] {
  const nums: string[] = [];
  const max = size === 'M' ? 46 : size === 'L' ? 13 : 2;
  for (let i = 1; i <= max; i++) {
    nums.push(`${size}${String(i).padStart(2, '0')}`);
  }
  return nums;
}

function getDefaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// lib/validation.ts calculateExpiryDate 와 동일한 규칙 (시작일 포함 N개월 → 마지막 하루 전).
function calculateEndDate(startDateStr: string, months: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) return '';
  const d = new Date(startDateStr + 'T00:00:00+09:00');
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function describeDiscount(result: PriceResult): string {
  if (result.freeMonths > 0) {
    return `오픈 프로모션 · ${result.freeMonths}개월 무료`;
  }
  if (result.discountRate > 0) {
    return `${Math.round(result.discountRate * 100)}% 할인 적용`;
  }
  return '';
}

/**
 * 프로모션 rule 을 사람이 이해하는 조합 문자열로 풀어 표시.
 * 예: "첫달 50% + 3~5개월 20%" — blended rate 대신 구간별 원본을 보여주므로
 * "2개월=33% 할인" 같이 혼란스러운 표현을 피한다.
 *
 * override: 관리자가 입력한 planLabel 이 있으면 자동 조합 대신 그 문구 사용.
 */
function describePromotionPlan(rule: PromotionRule | null, months: number, override?: string | null): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  if (!rule) return '';
  if (rule.type === 'discount_rate') {
    const r = Math.round(Number(rule.discountRate ?? 0) * 100);
    return r > 0 ? `전 기간 ${r}% 할인` : '';
  }
  if (rule.type === 'free_months' && rule.freeMonths) {
    return `${rule.freeMonths}개월 무료`;
  }
  if (rule.type === 'fixed_discount' && rule.discountAmount) {
    return `₩${rule.discountAmount.toLocaleString()} 할인`;
  }
  if (rule.type === 'per_month_schedule') {
    const schedule = Array.isArray(rule.monthlySchedule) ? rule.monthlySchedule : [];
    const parts: string[] = [];
    for (const entry of schedule) {
      const overlapping = entry.months.filter(m => m >= 1 && m <= months);
      if (overlapping.length === 0) continue;
      const rate = Math.round(entry.rate * 100);
      parts.push(`${formatMonthSpan(overlapping)} ${rate}%`);
    }
    return parts.join(' + ');
  }
  return '';
}

interface RentalSegment {
  start: number;
  end: number;
  rate: number;          // 0~1
  monthlyAmount: number; // 각 월 납입액 (무료월은 0)
  free: boolean;
}

/**
 * 렌탈 기간을 할인 구간별로 분할. 연속된 같은 rate 는 한 세그먼트로 병합.
 * 모든 프로모션 타입을 지원.
 */
function buildRentalSegments(size: CabinetSize, months: number, rule: PromotionRule | null): RentalSegment[] {
  const base = SIZE_INFO[size].price;
  const rates: { rate: number; free: boolean }[] = [];

  if (!rule) {
    const p = calculatePrice({ cabinetSize: size, months, promotion: null });
    for (let m = 1; m <= months; m++) rates.push({ rate: p.discountRate, free: false });
  } else if (rule.type === 'discount_rate') {
    const r = Math.min(Math.max(Number(rule.discountRate ?? 0), 0), 1);
    for (let m = 1; m <= months; m++) rates.push({ rate: r, free: false });
  } else if (rule.type === 'free_months') {
    const free = Math.min(Math.max(rule.freeMonths ?? 0, 0), months - 1);
    const paid = months - free;
    for (let m = 1; m <= paid; m++) rates.push({ rate: 0, free: false });
    for (let m = paid + 1; m <= months; m++) rates.push({ rate: 1, free: true });
  } else if (rule.type === 'per_month_schedule') {
    const schedule = Array.isArray(rule.monthlySchedule) ? rule.monthlySchedule : [];
    for (let m = 1; m <= months; m++) {
      const entry = schedule.find(e => e.months.includes(m));
      rates.push({ rate: entry?.rate ?? 0, free: false });
    }
  } else {
    // fixed_discount: 총액 할인을 균등 분산 → 전 기간 동일 rate
    const amount = Math.max(rule.discountAmount ?? 0, 0);
    const baseRental = base * months;
    const totalRental = Math.max(baseRental - amount, 0);
    const effectiveRate = baseRental > 0 ? (baseRental - totalRental) / baseRental : 0;
    for (let m = 1; m <= months; m++) rates.push({ rate: effectiveRate, free: false });
  }

  if (rates.length === 0) return [];

  const segments: RentalSegment[] = [];
  let segStart = 1;
  for (let i = 1; i < rates.length; i++) {
    if (rates[i].rate !== rates[i - 1].rate || rates[i].free !== rates[i - 1].free) {
      const cur = rates[i - 1];
      segments.push({
        start: segStart,
        end: i,
        rate: cur.rate,
        monthlyAmount: cur.free ? 0 : Math.round(base * (1 - cur.rate)),
        free: cur.free,
      });
      segStart = i + 1;
    }
  }
  const last = rates[rates.length - 1];
  segments.push({
    start: segStart,
    end: rates.length,
    rate: last.rate,
    monthlyAmount: last.free ? 0 : Math.round(base * (1 - last.rate)),
    free: last.free,
  });
  return segments;
}

function segmentLabel(start: number, end: number): string {
  const length = end - start + 1;
  if (start === 1 && length === 1) return '첫달';
  if (start === 1) return `첫 ${length}개월`;
  if (length === 1) return `${start}개월차`;
  return `${length}개월`;
}

function formatMonthSpan(months: number[]): string {
  if (months.length === 0) return '';
  const sorted = [...months].sort((a, b) => a - b);
  const isSequential = sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1);
  if (isSequential) {
    if (sorted.length === 1) return sorted[0] === 1 ? '첫달' : `${sorted[0]}개월`;
    if (sorted[0] === 1) return `첫 ${sorted[sorted.length - 1]}개월`;
    return `${sorted[0]}~${sorted[sorted.length - 1]}개월`;
  }
  return sorted.join(',') + '개월';
}

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}
