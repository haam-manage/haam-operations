import { NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { promotions } from '../../../../../db/schema';
import { and, eq, gte, lte, or, isNull, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/promotions/active
 * 현재 시각에 유효한 모든 활성 프로모션 행을 반환.
 * 클라이언트(BookingClient)가 선택된 size·months 조합에 맞는 룰을 골라 쓴다.
 */
export async function GET() {
  const now = new Date();
  const rows = await db
    .select({
      id: promotions.id,
      name: promotions.name,
      bannerLabel: promotions.bannerLabel,
      badgeLabel: promotions.badgeLabel,
      type: promotions.type,
      priority: promotions.priority,
      applicableSizes: promotions.applicableSizes,
      applicableMonths: promotions.applicableMonths,
      discountRate: promotions.discountRate,
      freeMonths: promotions.freeMonths,
      discountAmount: promotions.discountAmount,
      monthlySchedule: promotions.monthlySchedule,
    })
    .from(promotions)
    .where(
      and(
        eq(promotions.isActive, true),
        or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
        or(isNull(promotions.endsAt), gte(promotions.endsAt, now)),
      ),
    )
    .orderBy(desc(promotions.priority), desc(promotions.createdAt));

  return NextResponse.json({ promotions: rows });
}
