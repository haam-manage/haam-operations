import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../../../../../../db';
import { contracts, payments, cabinets, customers } from '../../../../../../db/schema';
import { eq } from 'drizzle-orm';
import { calculateExpiryDate } from '../../../../../../lib/validation';
import { sendContractExtendAlimtalk } from '../../../../../../lib/alimtalk';
import { notifyEvent } from '../../../../../../lib/telegram';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  months: z.number().int().min(1).max(36).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rentalAmount: z.number().int().min(0).optional(),
  remark: z.string().max(2000).optional(),
  remarkAppend: z.string().max(500).optional(),
  sendAlimtalk: z.boolean().optional(),
});

/**
 * DELETE /api/admin/contracts/:id
 *
 * 예약 상태(reserved) 계약 취소/삭제.
 * - 결제 대기(pending) 주문 행 함께 삭제
 * - 보관함 가용 상태 복구 (이미 가용이어도 안전)
 * - active/expired/archived 계약은 거부 (409) — 정식 만료·아카이빙 플로우 사용 필요
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.id, id),
  });

  if (!contract) {
    return NextResponse.json({ error: '계약을 찾을 수 없습니다' }, { status: 404 });
  }

  if (contract.status !== 'reserved') {
    return NextResponse.json(
      {
        error: '결제 대기 상태 계약만 직접 취소할 수 있습니다',
        detail: `현재 상태: ${contract.status}`,
      },
      { status: 409 },
    );
  }

  await db.delete(payments).where(eq(payments.contractId, contract.id));
  await db.delete(contracts).where(eq(contracts.id, contract.id));
  await db.update(cabinets).set({ isAvailable: true }).where(eq(cabinets.id, contract.cabinetId));

  return NextResponse.json({ success: true });
}

/**
 * PATCH /api/admin/contracts/:id
 *
 * 계약 수동 편집 (관리자 전용).
 * - months 변경 시 expiryDate 자동 재계산 (요청에 expiryDate 가 같이 오면 그것을 우선)
 * - rentalAmount 는 자동 재계산하지 않는다 — 가격 정책 변동·합의 금액 케이스가 다양하므로 명시 입력 필요
 * - remarkAppend 가 오면 기존 remark 에 timestamp 와 함께 추가, remark 가 오면 통째로 교체
 * - sendAlimtalk=true 이고 months/expiryDate 가 변경되면 CONTRACT_MONTH_CHANGE 알림톡 발송
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 JSON' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력 검증 실패', detail: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.id, id),
    with: { customer: true, cabinet: true },
  });

  if (!contract) {
    return NextResponse.json({ error: '계약을 찾을 수 없습니다' }, { status: 404 });
  }

  // 변경할 필드 계산
  const updates: Partial<typeof contracts.$inferInsert> = {};
  let scheduleChanged = false;

  if (input.months !== undefined && input.months !== contract.months) {
    updates.months = input.months;
    scheduleChanged = true;
  }

  if (input.expiryDate !== undefined) {
    if (input.expiryDate !== contract.expiryDate) {
      updates.expiryDate = input.expiryDate;
      scheduleChanged = true;
    }
  } else if (updates.months !== undefined) {
    // months 만 바뀌고 expiryDate 가 명시되지 않은 경우 자동 재계산
    updates.expiryDate = calculateExpiryDate(contract.startDate, updates.months);
    scheduleChanged = true;
  }

  if (input.rentalAmount !== undefined && input.rentalAmount !== contract.rentalAmount) {
    updates.rentalAmount = input.rentalAmount;
  }

  if (input.remark !== undefined) {
    updates.remark = input.remark;
  } else if (input.remarkAppend) {
    const stamp = new Date().toISOString().slice(0, 10);
    const line = `[${stamp}] ${input.remarkAppend}`;
    updates.remark = contract.remark ? `${contract.remark}\n${line}` : line;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '변경 사항이 없습니다' }, { status: 400 });
  }

  updates.updatedAt = new Date();

  await db.update(contracts).set(updates).where(eq(contracts.id, contract.id));

  // 알림톡 발송 (옵션)
  let alimtalk: { sent: boolean; reason?: string } = { sent: false };
  if (input.sendAlimtalk && scheduleChanged) {
    const newMonths = updates.months ?? contract.months;
    const newExpiry = (updates.expiryDate as string | undefined) ?? contract.expiryDate;
    const result = await sendContractExtendAlimtalk({
      phone: contract.customer!.phone,
      customerName: contract.customer!.name,
      cabinetNumber: contract.cabinet!.number,
      oldExpiryDate: contract.expiryDate,
      newExpiryDate: newExpiry,
      newMonths,
      contractId: contract.id,
    });
    alimtalk = { sent: result.success, reason: result.errorMessage };
  }

  if (scheduleChanged) {
    await notifyEvent('contract_extended', {
      고객: contract.customer!.name,
      보관함: contract.cabinet!.number,
      기존: `${contract.months}개월 (~${contract.expiryDate})`,
      변경: `${updates.months ?? contract.months}개월 (~${updates.expiryDate ?? contract.expiryDate})`,
      알림톡: alimtalk.sent ? '발송' : (input.sendAlimtalk ? `실패: ${alimtalk.reason}` : '미발송'),
    });
  }

  // 관계는 다시 조회해서 응답
  const updated = await db.query.contracts.findFirst({
    where: eq(contracts.id, contract.id),
  });

  return NextResponse.json({
    success: true,
    contract: updated,
    alimtalk,
  });
}

// customers import is needed for query type to compile
void customers;
