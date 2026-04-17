import { describe, it, expect } from 'vitest';
import { getNextTransition, type ContractForBatch } from '../../lib/status';

function makeContract(overrides: Partial<ContractForBatch> = {}): ContractForBatch {
  return {
    id: 'test-contract-1',
    expiryDate: '2026-04-23', // 기본 만료일
    renewal: null,
    status: 'active',
    ...overrides,
  };
}

describe('getNextTransition — 만료 플로우', () => {
  it('D-7: null → guide_sent_d7 (만료 예고)', () => {
    const c = makeContract({ expiryDate: '2026-04-23' });
    const r = getNextTransition(c, '2026-04-16'); // 7일 전
    expect(r).not.toBeNull();
    expect(r!.newRenewal).toBe('guide_sent_d7');
    expect(r!.alimtalkTemplate).toBe('EXPIRY_D7');
  });

  it('D-0: guide_sent_d7 → expired (만료 처리)', () => {
    const c = makeContract({ expiryDate: '2026-04-16', renewal: 'guide_sent_d7' });
    const r = getNextTransition(c, '2026-04-16');
    expect(r).not.toBeNull();
    expect(r!.newRenewal).toBe('expired');
    expect(r!.newStatus).toBe('expired');
    expect(r!.alimtalkTemplate).toBe('EXPIRY_D0');
    expect(r!.generateDepositToken).toBe(true);
  });

  it('D-0: null → expired (D-7 발송 없이 바로 만료)', () => {
    const c = makeContract({ expiryDate: '2026-04-16', renewal: null });
    const r = getNextTransition(c, '2026-04-16');
    expect(r).not.toBeNull();
    expect(r!.newRenewal).toBe('expired');
  });

  it('D+3: expired → archived (아카이빙)', () => {
    const c = makeContract({ expiryDate: '2026-04-13', renewal: 'expired', status: 'expired' });
    const r = getNextTransition(c, '2026-04-16'); // 만료 후 3일
    expect(r).not.toBeNull();
    expect(r!.newStatus).toBe('archived');
    expect(r!.alimtalkTemplate).toBeNull();
  });
});

describe('getNextTransition — 연체 플로우', () => {
  it('D+1: overdue_management → overdue_d1', () => {
    const c = makeContract({ expiryDate: '2026-04-15', renewal: 'overdue_management', status: 'active' });
    const r = getNextTransition(c, '2026-04-16'); // 만료 후 1일
    expect(r).not.toBeNull();
    expect(r!.newRenewal).toBe('overdue_d1');
    expect(r!.alimtalkTemplate).toBe('OVERDUE_D1');
  });

  it('D+3: overdue_d1 → overdue_d3', () => {
    const c = makeContract({ expiryDate: '2026-04-13', renewal: 'overdue_d1', status: 'active' });
    const r = getNextTransition(c, '2026-04-16');
    expect(r).not.toBeNull();
    expect(r!.newRenewal).toBe('overdue_d3');
    expect(r!.alimtalkTemplate).toBe('OVERDUE_D3');
  });

  it('D+7: overdue_d3 → overdue_d7', () => {
    const c = makeContract({ expiryDate: '2026-04-09', renewal: 'overdue_d3', status: 'active' });
    const r = getNextTransition(c, '2026-04-16');
    expect(r).not.toBeNull();
    expect(r!.newRenewal).toBe('overdue_d7');
    expect(r!.alimtalkTemplate).toBe('OVERDUE_D7');
  });
});

describe('getNextTransition — 특수 케이스', () => {
  it('재계약 상태면 전이 없음', () => {
    const c = makeContract({ renewal: 'renewed' });
    const r = getNextTransition(c, '2026-04-16');
    expect(r).toBeNull();
  });

  it('이미 archived 상태면 전이 없음', () => {
    const c = makeContract({ status: 'archived' });
    const r = getNextTransition(c, '2026-04-16');
    expect(r).toBeNull();
  });

  it('D-7이 아닌 날에는 전이 없음 (D-6)', () => {
    const c = makeContract({ expiryDate: '2026-04-22' });
    const r = getNextTransition(c, '2026-04-16'); // 6일 전
    expect(r).toBeNull();
  });

  it('D-7이지만 이미 guide_sent_d7이면 전이 없음', () => {
    const c = makeContract({ expiryDate: '2026-04-23', renewal: 'guide_sent_d7' });
    const r = getNextTransition(c, '2026-04-16');
    expect(r).toBeNull();
  });
});
