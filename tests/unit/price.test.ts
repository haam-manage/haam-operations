import { describe, it, expect } from 'vitest';
import { calculatePrice, extractCabinetSize, type PromotionRule } from '../../lib/price';

// 프로모션 없음 = null 전달 → DISCOUNT_TIERS 기본 적용
describe('calculatePrice — 일반 할인 (프로모션 없음)', () => {
  it('M / 1개월 / 할인 없음', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 1, promotion: null });
    expect(r.discountRate).toBe(0);
    expect(r.monthlyPrice).toBe(70_000);
    expect(r.totalRental).toBe(70_000);
    expect(r.totalAmount).toBe(140_000);
  });

  it('M / 3개월 / 10% 할인', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 3, promotion: null });
    expect(r.discountRate).toBe(0.10);
    expect(r.monthlyPrice).toBe(63_000);
    expect(r.totalRental).toBe(189_000);
    expect(r.totalAmount).toBe(259_000);
  });

  it('M / 6개월 / 15% 할인', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 6, promotion: null });
    expect(r.discountRate).toBe(0.15);
    expect(r.monthlyPrice).toBe(59_500);
    expect(r.totalRental).toBe(357_000);
    expect(r.totalAmount).toBe(427_000);
  });

  it('M / 12개월 / 20% 할인', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 12, promotion: null });
    expect(r.discountRate).toBe(0.20);
    expect(r.monthlyPrice).toBe(56_000);
    expect(r.totalRental).toBe(672_000);
    expect(r.totalAmount).toBe(742_000);
  });

  it('L / 6개월 / 15% 할인', () => {
    const r = calculatePrice({ cabinetSize: 'L', months: 6, promotion: null });
    expect(r.discountRate).toBe(0.15);
    expect(r.monthlyPrice).toBe(102_000);
    expect(r.totalRental).toBe(612_000);
    expect(r.totalAmount).toBe(732_000);
  });

  it('XL / 12개월 / 20% 할인', () => {
    const r = calculatePrice({ cabinetSize: 'XL', months: 12, promotion: null });
    expect(r.discountRate).toBe(0.20);
    expect(r.monthlyPrice).toBe(160_000);
    expect(r.totalRental).toBe(1_920_000);
    expect(r.totalAmount).toBe(2_120_000);
  });

  it('M / 2개월 / 할인 없음', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 2, promotion: null });
    expect(r.discountRate).toBe(0);
    expect(r.totalRental).toBe(140_000);
    expect(r.totalAmount).toBe(210_000);
  });
});

// 오픈기념 프로모션 — DB 룰로 표현
describe('calculatePrice — discount_rate 룰', () => {
  const rule15: PromotionRule = { type: 'discount_rate', discountRate: '0.15' };

  it('M / 1개월 / 15% 할인 룰', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 1, promotion: rule15 });
    expect(r.discountRate).toBe(0.15);
    expect(r.monthlyPrice).toBe(59_500);
    expect(r.billableMonths).toBe(1);
    expect(r.freeMonths).toBe(0);
    expect(r.totalRental).toBe(59_500);
    expect(r.totalAmount).toBe(129_500);
  });
});

describe('calculatePrice — free_months 룰', () => {
  it('M / 3개월 / 1달 무료', () => {
    const rule: PromotionRule = { type: 'free_months', freeMonths: 1 };
    const r = calculatePrice({ cabinetSize: 'M', months: 3, promotion: rule });
    expect(r.discountRate).toBe(0);
    expect(r.monthlyPrice).toBe(70_000);
    expect(r.billableMonths).toBe(2);
    expect(r.freeMonths).toBe(1);
    expect(r.totalRental).toBe(140_000);
    expect(r.totalAmount).toBe(210_000);
  });

  it('M / 6개월 / 2달 무료', () => {
    const rule: PromotionRule = { type: 'free_months', freeMonths: 2 };
    const r = calculatePrice({ cabinetSize: 'M', months: 6, promotion: rule });
    expect(r.billableMonths).toBe(4);
    expect(r.freeMonths).toBe(2);
    expect(r.totalRental).toBe(280_000);
    expect(r.totalAmount).toBe(350_000);
  });

  it('M / 12개월 / 4달 무료', () => {
    const rule: PromotionRule = { type: 'free_months', freeMonths: 4 };
    const r = calculatePrice({ cabinetSize: 'M', months: 12, promotion: rule });
    expect(r.billableMonths).toBe(8);
    expect(r.freeMonths).toBe(4);
    expect(r.totalRental).toBe(560_000);
    expect(r.totalAmount).toBe(630_000);
  });

  it('L / 3개월 / 1달 무료', () => {
    const rule: PromotionRule = { type: 'free_months', freeMonths: 1 };
    const r = calculatePrice({ cabinetSize: 'L', months: 3, promotion: rule });
    expect(r.billableMonths).toBe(2);
    expect(r.totalRental).toBe(240_000);
    expect(r.totalAmount).toBe(360_000);
  });

  it('freeMonths 가 months 이상이면 최소 1달은 결제', () => {
    const rule: PromotionRule = { type: 'free_months', freeMonths: 99 };
    const r = calculatePrice({ cabinetSize: 'M', months: 3, promotion: rule });
    expect(r.billableMonths).toBe(1);
    expect(r.freeMonths).toBe(2);
  });
});

describe('calculatePrice — fixed_discount 룰', () => {
  it('M / 3개월 / ₩30,000 정액 할인', () => {
    const rule: PromotionRule = { type: 'fixed_discount', discountAmount: 30_000 };
    const r = calculatePrice({ cabinetSize: 'M', months: 3, promotion: rule });
    expect(r.totalRental).toBe(180_000); // 70k * 3 - 30k
    expect(r.totalAmount).toBe(250_000);
  });

  it('할인액이 총 렌탈료 초과 시 총액은 0 이상', () => {
    const rule: PromotionRule = { type: 'fixed_discount', discountAmount: 999_999_999 };
    const r = calculatePrice({ cabinetSize: 'M', months: 1, promotion: rule });
    expect(r.totalRental).toBe(0);
    expect(r.totalAmount).toBe(70_000); // 보증금만
  });
});

describe('calculatePrice — per_month_schedule 룰', () => {
  // 사용자 시나리오: 1개월=50%, 2~3개월=20% → 3개월 계약 시 35 + 56 + 56 = 147,000
  const rule: PromotionRule = {
    type: 'per_month_schedule',
    monthlySchedule: [
      { months: [1], rate: 0.5 },
      { months: [2, 3], rate: 0.2 },
    ],
  };

  it('M / 1개월 계약 → 35,000', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 1, promotion: rule });
    expect(r.totalRental).toBe(35_000);
    expect(r.totalAmount).toBe(105_000); // + 보증금 70,000
  });

  it('M / 2개월 계약 → 35,000 + 56,000 = 91,000', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 2, promotion: rule });
    expect(r.totalRental).toBe(91_000);
    expect(r.totalAmount).toBe(161_000);
  });

  it('M / 3개월 계약 → 35,000 + 56,000 + 56,000 = 147,000', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 3, promotion: rule });
    expect(r.totalRental).toBe(147_000);
    expect(r.totalAmount).toBe(217_000);
    expect(r.billableMonths).toBe(3);
    expect(r.freeMonths).toBe(0);
  });

  it('L / 3개월 계약 → 사이즈 별 등비율 적용', () => {
    const r = calculatePrice({ cabinetSize: 'L', months: 3, promotion: rule });
    // 60,000 + 96,000 + 96,000 = 252,000
    expect(r.totalRental).toBe(252_000);
  });

  it('스케줄에 없는 월은 정가 (할인 0%)', () => {
    // 4개월 계약: 1=50%, 2=20%, 3=20%, 4=정가
    const r = calculatePrice({ cabinetSize: 'M', months: 4, promotion: rule });
    expect(r.totalRental).toBe(35_000 + 56_000 + 56_000 + 70_000); // 217,000
  });

  it('빈 스케줄 → 전 구간 정가', () => {
    const empty: PromotionRule = { type: 'per_month_schedule', monthlySchedule: [] };
    const r = calculatePrice({ cabinetSize: 'M', months: 3, promotion: empty });
    expect(r.totalRental).toBe(210_000); // 70k × 3
    expect(r.discountRate).toBe(0);
  });
});

describe('extractCabinetSize', () => {
  it('M01 → M', () => expect(extractCabinetSize('M01')).toBe('M'));
  it('L13 → L', () => expect(extractCabinetSize('L13')).toBe('L'));
  it('XL02 → XL', () => expect(extractCabinetSize('XL02')).toBe('XL'));
  it('빈 문자열 → M (기본값)', () => expect(extractCabinetSize('')).toBe('M'));
});
