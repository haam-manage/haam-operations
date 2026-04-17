import { describe, it, expect } from 'vitest';
import {
  validatePhone,
  cleanPhone,
  validateCabinetNumber,
  getAllCabinetNumbers,
  validateSecurityCode,
  generateSecurityCode,
  canAddCoUser,
  getMaxUsers,
  validateDateFormat,
  calculateExpiryDate,
} from '../../lib/validation';

describe('validatePhone', () => {
  it('유효한 전화번호 (11자리)', () => expect(validatePhone('01012345678')).toBe(true));
  it('유효한 전화번호 (하이픈 포함)', () => expect(validatePhone('010-1234-5678')).toBe(true));
  it('유효한 전화번호 (10자리)', () => expect(validatePhone('0101234567')).toBe(true));
  it('무효 — 짧은 번호', () => expect(validatePhone('0101234')).toBe(false));
  it('무효 — 문자 포함', () => expect(validatePhone('010abcd5678')).toBe(false));
  it('무효 — 02 시작', () => expect(validatePhone('0212345678')).toBe(false));
});

describe('cleanPhone', () => {
  it('하이픈 제거', () => expect(cleanPhone('010-1234-5678')).toBe('01012345678'));
  it('공백 제거', () => expect(cleanPhone('010 1234 5678')).toBe('01012345678'));
  it('이미 깨끗한 번호', () => expect(cleanPhone('01012345678')).toBe('01012345678'));
});

describe('validateCabinetNumber', () => {
  it('M01 유효', () => expect(validateCabinetNumber('M01')).toBe(true));
  it('M46 유효', () => expect(validateCabinetNumber('M46')).toBe(true));
  it('L01 유효', () => expect(validateCabinetNumber('L01')).toBe(true));
  it('L13 유효', () => expect(validateCabinetNumber('L13')).toBe(true));
  it('XL01 유효', () => expect(validateCabinetNumber('XL01')).toBe(true));
  it('XL02 유효', () => expect(validateCabinetNumber('XL02')).toBe(true));
  it('M47 무효 (범위 초과)', () => expect(validateCabinetNumber('M47')).toBe(false));
  it('L14 무효 (범위 초과)', () => expect(validateCabinetNumber('L14')).toBe(false));
  it('XL03 무효 (범위 초과)', () => expect(validateCabinetNumber('XL03')).toBe(false));
  it('소문자 m01 유효', () => expect(validateCabinetNumber('m01')).toBe(true));
});

describe('getAllCabinetNumbers', () => {
  it('총 61개 보관함', () => {
    const all = getAllCabinetNumbers();
    expect(all.length).toBe(61);
  });
});

describe('validateSecurityCode', () => {
  it('유효한 코드 (12345)', () => expect(validateSecurityCode('12345')).toBe(true));
  it('유효한 코드 (91234)', () => expect(validateSecurityCode('91234')).toBe(true));
  it('무효 — 첫 자리 0', () => expect(validateSecurityCode('01234')).toBe(false));
  it('무효 — 4자리', () => expect(validateSecurityCode('1234')).toBe(false));
  it('무효 — 6자리', () => expect(validateSecurityCode('123456')).toBe(false));
  it('무효 — 문자 포함', () => expect(validateSecurityCode('1234a')).toBe(false));
});

describe('generateSecurityCode', () => {
  it('5자리 숫자 생성', () => {
    const code = generateSecurityCode();
    expect(code.length).toBe(5);
    expect(validateSecurityCode(code)).toBe(true);
  });

  it('100번 생성해도 모두 유효', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateSecurityCode();
      expect(validateSecurityCode(code)).toBe(true);
    }
  });
});

describe('canAddCoUser', () => {
  it('M: 1명 → 추가 가능', () => expect(canAddCoUser('M', 1)).toBe(true));
  it('M: 2명 → 추가 불가 (상한)', () => expect(canAddCoUser('M', 2)).toBe(false));
  it('L: 2명 → 추가 가능', () => expect(canAddCoUser('L', 2)).toBe(true));
  it('L: 3명 → 추가 불가', () => expect(canAddCoUser('L', 3)).toBe(false));
  it('XL: 3명 → 추가 가능', () => expect(canAddCoUser('XL', 3)).toBe(true));
  it('XL: 4명 → 추가 불가', () => expect(canAddCoUser('XL', 4)).toBe(false));
});

describe('getMaxUsers', () => {
  it('M = 2', () => expect(getMaxUsers('M')).toBe(2));
  it('L = 3', () => expect(getMaxUsers('L')).toBe(3));
  it('XL = 4', () => expect(getMaxUsers('XL')).toBe(4));
});

describe('validateDateFormat', () => {
  it('유효한 날짜', () => expect(validateDateFormat('2026-04-16')).toBe(true));
  it('무효 — 잘못된 형식', () => expect(validateDateFormat('2026/04/16')).toBe(false));
  it('무효 — 존재하지 않는 날짜', () => expect(validateDateFormat('2026-02-30')).toBe(false));
});

describe('calculateExpiryDate', () => {
  it('1개월 계약', () => {
    expect(calculateExpiryDate('2026-04-01', 1)).toBe('2026-04-30');
  });

  it('3개월 계약', () => {
    expect(calculateExpiryDate('2026-04-01', 3)).toBe('2026-06-30');
  });

  it('12개월 계약', () => {
    expect(calculateExpiryDate('2026-04-01', 12)).toBe('2027-03-31');
  });
});
