import { NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { banners } from '../../../../../db/schema';
import { and, eq, gte, lte, or, isNull, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/banner/active
 * 현재 시각 기준으로 활성 배너 중 priority 최상위 1건을 반환.
 * 없으면 { banner: null }.
 */
export async function GET() {
  const now = new Date();
  const [row] = await db
    .select({
      id: banners.id,
      label: banners.label,
      priority: banners.priority,
    })
    .from(banners)
    .where(
      and(
        eq(banners.isActive, true),
        or(isNull(banners.startsAt), lte(banners.startsAt, now)),
        or(isNull(banners.endsAt), gte(banners.endsAt, now)),
      ),
    )
    .orderBy(desc(banners.priority), desc(banners.createdAt))
    .limit(1);

  return NextResponse.json({ banner: row ?? null });
}
