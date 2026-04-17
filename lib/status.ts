/**
 * HAAM 계약 상태 머신
 *
 * 비즈니스 규칙 원본: docs/business-rules.md §4~§5
 * GAS 원본: legacy-gas/AutomationService.gs
 */

// ─────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────

export type RenewalStatus =
  | null
  | 'guide_sent_d7'
  | 'expired'
  | 'overdue_management'
  | 'overdue_d1'
  | 'overdue_d3'
  | 'overdue_d7'
  | 'renewed';

export interface ContractForBatch {
  id: string;
  expiryDate: string;      // YYYY-MM-DD (KST 기준)
  renewal: RenewalStatus;
  status: 'reserved' | 'active' | 'expired' | 'archived';
}

export interface StateTransition {
  contractId: string;
  oldRenewal: RenewalStatus;
  newRenewal: RenewalStatus;
  newStatus?: 'expired' | 'archived';
  alimtalkTemplate: string | null;  // 발송할 템플릿 ID (null이면 발송 안 함)
  action: string;                   // 사람이 읽을 수 있는 액션 설명
  generateDepositToken?: boolean;   // 보증금 반환 토큰 발급 여부
}

// ─────────────────────────────────────────
// 날짜 유틸
// ─────────────────────────────────────────

function diffDays(expiryDate: string, today: string): number {
  const expiry = new Date(expiryDate + 'T00:00:00+09:00');
  const now = new Date(today + 'T00:00:00+09:00');
  return Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────
// 상태 전이 판정
// ─────────────────────────────────────────

export function getNextTransition(
  contract: ContractForBatch,
  todayKST: string, // YYYY-MM-DD
): StateTransition | null {
  const days = diffDays(contract.expiryDate, todayKST);

  // 이미 아카이빙된 계약은 처리 안 함
  if (contract.status === 'archived') return null;

  // 재계약 상태면 D-7/D-0 알림 스킵
  if (contract.renewal === 'renewed') return null;

  // ──── 만료 플로우 ────

  // D-7: 만료 예고 알림
  if (days === 7 && contract.renewal === null && contract.status === 'active') {
    return {
      contractId: contract.id,
      oldRenewal: null,
      newRenewal: 'guide_sent_d7',
      alimtalkTemplate: 'EXPIRY_D7',
      action: 'D-7 만료 예고 알림 발송',
    };
  }

  // D-0: 만료 처리
  if (days === 0 && (contract.renewal === null || contract.renewal === 'guide_sent_d7') && contract.status === 'active') {
    return {
      contractId: contract.id,
      oldRenewal: contract.renewal,
      newRenewal: 'expired',
      newStatus: 'expired',
      alimtalkTemplate: 'EXPIRY_D0',
      action: 'D-0 만료 처리 + 보증금 반환 토큰 발급',
      generateDepositToken: true,
    };
  }

  // D+3: 아카이빙 (만료 후 3일)
  if (days === -3 && contract.renewal === 'expired' && contract.status === 'expired') {
    return {
      contractId: contract.id,
      oldRenewal: 'expired',
      newRenewal: 'expired',
      newStatus: 'archived',
      alimtalkTemplate: null,
      action: 'D+3 아카이빙',
    };
  }

  // ──── 연체 플로우 ────

  // D+1: 연체 1차 경고
  if (days === -1 && contract.renewal === 'overdue_management') {
    return {
      contractId: contract.id,
      oldRenewal: 'overdue_management',
      newRenewal: 'overdue_d1',
      alimtalkTemplate: 'OVERDUE_D1',
      action: 'D+1 연체 1차 경고',
    };
  }

  // D+3: 연체 2차 경고
  if (days === -3 && contract.renewal === 'overdue_d1') {
    return {
      contractId: contract.id,
      oldRenewal: 'overdue_d1',
      newRenewal: 'overdue_d3',
      alimtalkTemplate: 'OVERDUE_D3',
      action: 'D+3 연체 2차 경고',
    };
  }

  // D+7: 연체 최종 경고
  if (days === -7 && contract.renewal === 'overdue_d3') {
    return {
      contractId: contract.id,
      oldRenewal: 'overdue_d3',
      newRenewal: 'overdue_d7',
      alimtalkTemplate: 'OVERDUE_D7',
      action: 'D+7 연체 최종 경고',
    };
  }

  return null;
}
