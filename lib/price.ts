/**
 * HAAM 가격 계산 모듈
 *
 * 비즈니스 규칙 원본: docs/business-rules.md §1~§2
 * GAS 원본: legacy-gas/AlimtalkService.gs calculatePricing_(), calculatePromoPricing_()
 */

// ─────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────

export type CabinetSize = 'M' | 'L' | 'XL';

export interface PriceInput {
  cabinetSize: CabinetSize;
  months: number;         // 계약 개월수 (1~12)
  promotionActive: boolean;
}

export interface PriceResult {
  cabinetSize: CabinetSize;
  basePrice: number;        // 월 정가
  deposit: number;          // 보증금
  discountRate: number;     // 적용 할인율 (0~1)
  monthlyPrice: number;     // 할인 적용 월 단가
  billableMonths: number;   // 실결제 개월수
  freeMonths: number;       // 무료 개월수
  totalRental: number;      // 총 렌탈료
  totalAmount: number;      // 총 결제금액 (렌탈 + 보증금)
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

const PROMOTION_PRICING: Record<number, { payMonths: number; freeMonths: number; discountRate: number }> = {
  1:  { payMonths: 1, freeMonths: 0, discountRate: 0.15 },
  3:  { payMonths: 2, freeMonths: 1, discountRate: 0    },
  6:  { payMonths: 4, freeMonths: 2, discountRate: 0    },
  12: { payMonths: 8, freeMonths: 4, discountRate: 0    },
};

// ─────────────────────────────────────────
// 가격 계산 함수
// ─────────────────────────────────────────

export function calculatePrice(input: PriceInput): PriceResult {
  const { cabinetSize, months, promotionActive } = input;
  const priceInfo = PRICING[cabinetSize];

  if (promotionActive) {
    return calculatePromoPrice(cabinetSize, months, priceInfo);
  }
  return calculateNormalPrice(cabinetSize, months, priceInfo);
}

function calculateNormalPrice(
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
): PriceResult {
  const promo = PROMOTION_PRICING[months];

  // 프로모션 테이블에 없는 개월수 → 일반 할인 적용
  if (!promo) {
    return calculateNormalPrice(cabinetSize, months, priceInfo);
  }

  const monthlyPrice = Math.round(priceInfo.basePrice * (1 - promo.discountRate));
  const totalRental = monthlyPrice * promo.payMonths;

  return {
    cabinetSize,
    basePrice: priceInfo.basePrice,
    deposit: priceInfo.deposit,
    discountRate: promo.discountRate,
    monthlyPrice,
    billableMonths: promo.payMonths,
    freeMonths: promo.freeMonths,
    totalRental,
    totalAmount: totalRental + priceInfo.deposit,
  };
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
