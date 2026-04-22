import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../db';
import { contracts, payments, cabinets } from '../../../../../../db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

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
