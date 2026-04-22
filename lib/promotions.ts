import { db } from '../db';
import { promotions } from '../db/schema';
import { and, desc, eq, gte, lte, or, isNull, sql } from 'drizzle-orm';

export const OPENING_PROMO_NAME = '오픈기념 프로모션';

/**
 * 현재 시각에 유효한 활성 프로모션을 1건 반환.
 * - isActive = true
 * - startsAt ≤ now ≤ endsAt (null 이면 제한 없음)
 * - priority DESC → createdAt DESC
 */
export async function getActivePromotion() {
  const now = new Date();
  const rows = await db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.isActive, true),
        or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
        or(isNull(promotions.endsAt), gte(promotions.endsAt, now)),
      ),
    )
    .orderBy(desc(promotions.priority), desc(promotions.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function isPromotionActive(): Promise<boolean> {
  return (await getActivePromotion()) !== null;
}

/**
 * "오픈기념 프로모션" 시드 행 보장 (없으면 비활성 상태로 생성).
 * price.ts 의 PROMOTION_PRICING 테이블을 게이팅하는 단일 플래그 역할.
 */
export async function ensureOpeningPromotion() {
  const existing = await db.query.promotions.findFirst({
    where: eq(promotions.name, OPENING_PROMO_NAME),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(promotions)
    .values({
      name: OPENING_PROMO_NAME,
      type: 'free_months',
      isActive: false,
      priority: 100,
      isNewOnly: false,
    })
    .returning();
  return created;
}
