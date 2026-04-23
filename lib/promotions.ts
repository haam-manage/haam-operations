import { db } from '../db';
import { promotions } from '../db/schema';
import { and, desc, eq, gte, lte, or, isNull, sql } from 'drizzle-orm';
import type { PromotionRule, CabinetSize } from './price';

export type Promotion = typeof promotions.$inferSelect;

/**
 * 주어진 사이즈·개월 조합에 적용 가능한 활성 프로모션 중 우선순위 최상위 1건.
 * - isActive = true
 * - applicableSizes 에 size 포함 (null = 전체 허용)
 * - applicableMonths 에 months 포함 (null = 전체 허용)
 * - startsAt ≤ now ≤ endsAt (null = 무제한)
 * - priority DESC → createdAt DESC
 */
export async function findApplicablePromotion(
  cabinetSize: CabinetSize,
  months: number,
): Promise<Promotion | null> {
  const now = new Date();
  const rows = await db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.isActive, true),
        or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
        or(isNull(promotions.endsAt), gte(promotions.endsAt, now)),
        or(
          isNull(promotions.applicableSizes),
          sql`${promotions.applicableSizes} @> ${JSON.stringify([cabinetSize])}::jsonb`,
        ),
        or(
          isNull(promotions.applicableMonths),
          sql`${promotions.applicableMonths} @> ${JSON.stringify([months])}::jsonb`,
        ),
      ),
    )
    .orderBy(desc(promotions.priority), desc(promotions.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** 현재 시각에 활성화된 프로모션이 하나라도 있는지 (관리자 UI·광고 배너용) */
export async function hasActivePromotion(): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .select({ id: promotions.id })
    .from(promotions)
    .where(
      and(
        eq(promotions.isActive, true),
        or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
        or(isNull(promotions.endsAt), gte(promotions.endsAt, now)),
      ),
    )
    .limit(1);
  return !!row;
}

/** Drizzle row → calculatePrice 에 전달 가능한 룰로 변환 */
export function toPromotionRule(p: Promotion | null): PromotionRule | null {
  if (!p) return null;
  return {
    type: p.type,
    discountRate: p.discountRate,
    freeMonths: p.freeMonths,
    discountAmount: p.discountAmount,
    monthlySchedule: (p.monthlySchedule as { months: number[]; rate: number }[] | null) ?? null,
  };
}

/** 관리자 UI 에서 사용할 전체 목록 */
export async function listPromotions(): Promise<Promotion[]> {
  return db
    .select()
    .from(promotions)
    .orderBy(desc(promotions.priority), desc(promotions.createdAt));
}
