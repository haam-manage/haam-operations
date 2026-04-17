/**
 * HAAM 검증 규칙
 *
 * 비즈니스 규칙 원본: docs/business-rules.md §1, §6, §7
 * GAS 원본: legacy-gas/Utils.gs, legacy-gas/Constants.gs CABINET_MAX_USERS
 */

import type { CabinetSize } from './price';

// ─────────────────────────────────────────
// 전화번호 검증
// ─────────────────────────────────────────

/**
 * 한국 휴대폰 번호 검증 (10~11자리 숫자)
 * 하이픈/공백 자동 제거 후 검증
 */
export function validatePhone(phone: string): boolean {
  const cleaned = cleanPhone(phone);
  return /^01[016789]\d{7,8}$/.test(cleaned);
}

/**
 * 전화번호 정규화 (하이픈/공백 제거)
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/[-\s]/g, '');
}

// ─────────────────────────────────────────
// 보관함 번호 검증
// ─────────────────────────────────────────

const VALID_CABINETS = new Set<string>();

// M01~M46
for (let i = 1; i <= 46; i++) VALID_CABINETS.add(`M${String(i).padStart(2, '0')}`);
// L01~L13
for (let i = 1; i <= 13; i++) VALID_CABINETS.add(`L${String(i).padStart(2, '0')}`);
// XL01~XL02
for (let i = 1; i <= 2; i++) VALID_CABINETS.add(`XL${String(i).padStart(2, '0')}`);

/**
 * 유효한 보관함 번호인지 검증
 * 형식: M01~M46, L01~L13, XL01~XL02
 */
export function validateCabinetNumber(cabinet: string): boolean {
  return VALID_CABINETS.has(cabinet.toUpperCase());
}

/**
 * 전체 유효 보관함 번호 목록 반환
 */
export function getAllCabinetNumbers(): string[] {
  return Array.from(VALID_CABINETS).sort();
}

// ─────────────────────────────────────────
// 보안코드 검증
// ─────────────────────────────────────────

/**
 * 보안코드: 5자리 숫자, 첫 자리 1~9
 */
export function validateSecurityCode(code: string): boolean {
  return /^[1-9]\d{4}$/.test(code);
}

/**
 * 보안코드 생성 (5자리, 첫 자리 1~9)
 */
export function generateSecurityCode(): string {
  const first = Math.floor(Math.random() * 9) + 1; // 1~9
  const rest = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${first}${rest}`;
}

// ─────────────────────────────────────────
// 공동사용자 상한 검증
// ─────────────────────────────────────────

const MAX_USERS: Record<CabinetSize, number> = {
  M: 2,
  L: 3,
  XL: 4,
};

/**
 * 공동사용자 추가 가능 여부 검증
 * @param currentTotal 현재 총 이용자 수 (대표자 포함)
 */
export function canAddCoUser(cabinetSize: CabinetSize, currentTotal: number): boolean {
  return currentTotal < MAX_USERS[cabinetSize];
}

/**
 * 사이즈별 최대 이용자 수 반환
 */
export function getMaxUsers(cabinetSize: CabinetSize): number {
  return MAX_USERS[cabinetSize];
}

// ─────────────────────────────────────────
// 날짜 검증
// ─────────────────────────────────────────

/**
 * YYYY-MM-DD 형식 검증
 */
export function validateDateFormat(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * 만료일 계산 (시작일 + N개월)
 */
export function calculateExpiryDate(startDate: string, months: number): string {
  const d = new Date(startDate + 'T00:00:00+09:00');
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1); // 시작일 포함이므로 하루 전
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
