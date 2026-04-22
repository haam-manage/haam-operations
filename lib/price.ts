/**
 * HAAM 가격 계산 모듈
 *
 * 비즈니스 규칙 원본: docs/business-rules.md §1~§2
 * GAS 원본: legacy-gas/AlimtalkService.gs calculatePricing_(), calculatePromoPricing_()
 *
 * DB 프로모션 연동: `findApplicablePromotion()`가 반환한 룰을 promotion 으로 전달.
 * promotion === null 이면 장기할인(DISCOUNT_TIERS) 기본 적용.
 */

// ─────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────

export type CabinetSize = 'M' | 'L' | 'XL';
export type PromotionType = 'discount_rate' | 'free_months' | 'fixed_discount';

export interface PromotionRule {
  type: PromotionType;
  discountRate?: string | number | null; // numeric (0~1). DB numeric → string
  freeMonths?: number | null;
  discountAmount?: number | null;        // 원 단위 총액 할인
}

export interface PriceInput {
  cabinetSize: CabinetSize;
  months: number;
  promotion: PromotionRule | null;
}

export interface PriceResult {
  cabinetSize: CabinetSize;
  basePrice: number;
  deposit: number;
  discountRate: number;
  monthlyPrice: number;
  billableMonths: number;
  freeMonths: number;
  totalRental: number;
  totalAmount: number;
}

// ─────────────────────────────────────────
// 상수
// ─────────────────────────────────────────

const PRICING: Record<CabinetSize, { basePrice: number; deposit: number }> = {
  M:  { basePrice: 70_000,  deposit: 70_000  },
  L:  { basePrice: 120_000, deposit: 120_000 },
  XL: { basePrice: 200_000, deposit: 200_000 },
};

const DISCOUNT_TIERS: { minMonths: number; rate: number }[] = [
  { minMonths: 12, rate: 0.20 },
  { minMonths:  6, rate: 0.15 },
  { minMonths:  3, rate: 0.10 },
  { minMonths:  1, rate: 0.00 },
];

// ─────────────────────────────────────────
// 가격 계산
// ─────────────────────────────────────────

export function calculatePrice(input: PriceInput): PriceResult {
  const { cabinetSize, months, promotion } = input;
  const priceInfo = PRICING[cabinetSize];

  if (!promotion) {
    return calculateTieredPrice(cabinetSize, months, priceInfo);
  }
  return calculatePromoPrice(cabinetSize, months, priceInfo, promotion);
}

function calculateTieredPrice(
  cabinetSize: CabinetSize,
  months: number,
  priceInfo: { basePrice: number; deposit: number },
): PriceResult {
  const tier = DISCOUNT_TIERS.find(t => months >= t.minMonths) ?? DISCOUNT_TIERS[DISCOUNT_TIERS.length - 1];
  const discountRate = tier.rate;
  const monthlyPrice = Math.round(priceInfo.basePrice * (1 - discountRate));
  const totalRental = monthlyPrice * months;

  return {
    cabinetSize,
    basePrice: priceInfo.basePrice,
    deposit: priceInfo.deposit,
    discountRate,
    monthlyPrice,
    billableMonths: months,
    freeMonths: 0,
    totalRental,
    totalAmount: totalRental + priceInfo.deposit,
  };
}

function calculatePromoPrice(
  cabinetSize: CabinetSize,
  months: number,
  priceInfo: { basePrice: number; deposit: number },
  promo: PromotionRule,
): PriceResult {
  if (promo.type === 'discount_rate') {
    const rate = Math.min(Math.max(toNumber(promo.discountRate) ?? 0, 0), 1);
    const monthlyPrice = Math.round(priceInfo.basePrice * (1 - rate));
    const totalRental = monthlyPrice * months;
    return {
      cabinetSize,
      basePrice: priceInfo.basePrice,
      deposit: priceInfo.deposit,
      discountRate: rate,
      monthlyPrice,
      billableMonths: months,
      freeMonths: 0,
      totalRental,
      totalAmount: totalRental + priceInfo.deposit,
    };
  }

  if (promo.type === 'free_months') {
    const free = Math.min(Math.max(promo.freeMonths ?? 0, 0), months - 1); // 최소 1개월은 결제
    const billable = months - free;
    const monthlyPrice = priceInfo.basePrice;
    const totalRental = monthlyPrice * billable;
    return {
      cabinetSize,
      basePrice: priceInfo.basePrice,
      deposit: priceInfo.deposit,
      discountRate: 0,
      monthlyPrice,
      billableMonths: billable,
      freeMonths: free,
      totalRental,
      totalAmount: totalRental + priceInfo.deposit,
    };
  }

  // fixed_discount: 총 렌탈료에서 정액 차감
  const amount = Math.max(promo.discountAmount ?? 0, 0);
  const baseRental = priceInfo.basePrice * months;
  const totalRental = Math.max(baseRental - amount, 0);
  const monthlyPrice = Math.round(totalRental / months);
  return {
    cabinetSize,
    basePrice: priceInfo.basePrice,
    deposit: priceInfo.deposit,
    discountRate: baseRental > 0 ? (baseRental - totalRental) / baseRental : 0,
    monthlyPrice,
    billableMonths: months,
    freeMonths: 0,
    totalRental,
    totalAmount: totalRental + priceInfo.deposit,
  };
}

function toNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// ─────────────────────────────────────────
// 보관함 번호에서 사이즈 추출
// ─────────────────────────────────────────

export function extractCabinetSize(cabinetNumber: string): CabinetSize {
  const match = cabinetNumber.match(/^([A-Z]+)/);
  const size = match ? match[1] : 'M';
  if (size === 'M' || size === 'L' || size === 'XL') return size;
  return 'M';
}
