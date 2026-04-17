import { describe, it, expect } from 'vitest';
import { calculatePrice, extractCabinetSize } from '../../lib/price';

describe('calculatePrice — 일반 할인 (프로모션 OFF)', () => {
  // M 사이즈 테스트
  it('M / 1개월 / 할인 없음', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 1, promotionActive: false });
    expect(r.discountRate).toBe(0);
    expect(r.monthlyPrice).toBe(70_000);
    expect(r.totalRental).toBe(70_000);
    expect(r.totalAmount).toBe(140_000); // 70000 + 70000 보증금
  });

  it('M / 3개월 / 10% 할인', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 3, promotionActive: false });
    expect(r.discountRate).toBe(0.10);
    expect(r.monthlyPrice).toBe(63_000);
    expect(r.totalRental).toBe(189_000);
    expect(r.totalAmount).toBe(259_000);
  });

  it('M / 6개월 / 15% 할인', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 6, promotionActive: false });
    expect(r.discountRate).toBe(0.15);
    expect(r.monthlyPrice).toBe(59_500);
    expect(r.totalRental).toBe(357_000);
    expect(r.totalAmount).toBe(427_000);
  });

  it('M / 12개월 / 20% 할인', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 12, promotionActive: false });
    expect(r.discountRate).toBe(0.20);
    expect(r.monthlyPrice).toBe(56_000);
    expect(r.totalRental).toBe(672_000);
    expect(r.totalAmount).toBe(742_000);
  });

  // L 사이즈 테스트
  it('L / 6개월 / 15% 할인', () => {
    const r = calculatePrice({ cabinetSize: 'L', months: 6, promotionActive: false });
    expect(r.discountRate).toBe(0.15);
    expect(r.monthlyPrice).toBe(102_000);
    expect(r.totalRental).toBe(612_000);
    expect(r.totalAmount).toBe(732_000);
  });

  // XL 사이즈 테스트
  it('XL / 12개월 / 20% 할인', () => {
    const r = calculatePrice({ cabinetSize: 'XL', months: 12, promotionActive: false });
    expect(r.discountRate).toBe(0.20);
    expect(r.monthlyPrice).toBe(160_000);
    expect(r.totalRental).toBe(1_920_000);
    expect(r.totalAmount).toBe(2_120_000);
  });

  it('M / 2개월 / 할인 없음', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 2, promotionActive: false });
    expect(r.discountRate).toBe(0);
    expect(r.totalRental).toBe(140_000);
    expect(r.totalAmount).toBe(210_000);
  });
});

describe('calculatePrice — 프로모션 (프로모션 ON)', () => {
  it('M / 1개월 / 15% 할인', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 1, promotionActive: true });
    expect(r.discountRate).toBe(0.15);
    expect(r.monthlyPrice).toBe(59_500);
    expect(r.billableMonths).toBe(1);
    expect(r.freeMonths).toBe(0);
    expect(r.totalRental).toBe(59_500);
    expect(r.totalAmount).toBe(129_500);
  });

  it('M / 3개월 / 2개월 결제 + 1개월 무료', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 3, promotionActive: true });
    expect(r.discountRate).toBe(0);
    expect(r.monthlyPrice).toBe(70_000);
    expect(r.billableMonths).toBe(2);
    expect(r.freeMonths).toBe(1);
    expect(r.totalRental).toBe(140_000);
    expect(r.totalAmount).toBe(210_000);
  });

  it('M / 6개월 / 4개월 결제 + 2개월 무료', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 6, promotionActive: true });
    expect(r.billableMonths).toBe(4);
    expect(r.freeMonths).toBe(2);
    expect(r.totalRental).toBe(280_000);
    expect(r.totalAmount).toBe(350_000);
  });

  it('M / 12개월 / 8개월 결제 + 4개월 무료', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 12, promotionActive: true });
    expect(r.billableMonths).toBe(8);
    expect(r.freeMonths).toBe(4);
    expect(r.totalRental).toBe(560_000);
    expect(r.totalAmount).toBe(630_000);
  });

  it('L / 3개월 / 프로모션 적용', () => {
    const r = calculatePrice({ cabinetSize: 'L', months: 3, promotionActive: true });
    expect(r.billableMonths).toBe(2);
    expect(r.totalRental).toBe(240_000);
    expect(r.totalAmount).toBe(360_000);
  });

  it('M / 5개월 / 프로모션 테이블에 없음 → 일반 할인 폴백', () => {
    const r = calculatePrice({ cabinetSize: 'M', months: 5, promotionActive: true });
    // 5개월은 프로모션 테이블에 없으므로 일반 10% 할인 적용
    expect(r.discountRate).toBe(0.10);
    expect(r.billableMonths).toBe(5);
    expect(r.freeMonths).toBe(0);
    expect(r.totalRental).toBe(315_000);
  });
});

describe('extractCabinetSize', () => {
  it('M01 → M', () => expect(extractCabinetSize('M01')).toBe('M'));
  it('L13 → L', () => expect(extractCabinetSize('L13')).toBe('L'));
  it('XL02 → XL', () => expect(extractCabinetSize('XL02')).toBe('XL'));
  it('빈 문자열 → M (기본값)', () => expect(extractCabinetSize('')).toBe('M'));
});
