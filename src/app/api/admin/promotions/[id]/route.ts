import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../db';
import { promotions, promotionTypeEnum, cabinetSizeEnum } from '../../../../../../db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type PromotionType = (typeof promotionTypeEnum.enumValues)[number];
type CabinetSize = (typeof cabinetSizeEnum.enumValues)[number];

/**
 * PATCH /api/admin/promotions/:id
 *
 * body 에 포함된 필드만 부분 업데이트. 단순 토글(isActive)·전체 수정 둘 다 지원.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const existing = await db.query.promotions.findFirst({
    where: eq(promotions.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: '프로모션을 찾을 수 없습니다' }, { status: 404 });
  }

  const patch: Partial<typeof promotions.$inferInsert> = { updatedAt: new Date() };
  const errors: string[] = [];

  if (typeof body.name === 'string') {
    const n = body.name.trim();
    if (!n || n.length > 100) errors.push('name 1~100자');
    else patch.name = n;
  }
  if (body.bannerLabel !== undefined) {
    if (body.bannerLabel === null || body.bannerLabel === '') patch.bannerLabel = null;
    else if (typeof body.bannerLabel === 'string') {
      const s = body.bannerLabel.trim();
      if (s.length > 100) errors.push('bannerLabel 100자 이내');
      else patch.bannerLabel = s || null;
    } else errors.push('bannerLabel 문자열 또는 null');
  }
  if (body.badgeLabel !== undefined) {
    if (body.badgeLabel === null || body.badgeLabel === '') patch.badgeLabel = null;
    else if (typeof body.badgeLabel === 'string') {
      const s = body.badgeLabel.trim();
      if (s.length > 50) errors.push('badgeLabel 50자 이내');
      else patch.badgeLabel = s || null;
    } else errors.push('badgeLabel 문자열 또는 null');
  }
  if (typeof body.isActive === 'boolean') patch.isActive = body.isActive;
  if (typeof body.isNewOnly === 'boolean') patch.isNewOnly = body.isNewOnly;
  if (Number.isFinite(Number(body.priority))) patch.priority = Number(body.priority);

  if (body.type !== undefined) {
    if (['discount_rate', 'free_months', 'fixed_discount', 'per_month_schedule'].includes(body.type)) {
      patch.type = body.type as PromotionType;
    } else errors.push('type 값 오류');
  }

  if (body.applicableSizes !== undefined) {
    if (body.applicableSizes === null) patch.applicableSizes = null;
    else if (Array.isArray(body.applicableSizes)) {
      const sizes = body.applicableSizes.filter((s: unknown) => s === 'M' || s === 'L' || s === 'XL') as CabinetSize[];
      patch.applicableSizes = sizes.length > 0 ? sizes : null;
    } else errors.push('applicableSizes 는 배열 또는 null');
  }

  if (body.applicableMonths !== undefined) {
    if (body.applicableMonths === null) patch.applicableMonths = null;
    else if (Array.isArray(body.applicableMonths)) {
      const months = body.applicableMonths.map(Number).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 12);
      patch.applicableMonths = months.length > 0 ? months : null;
    } else errors.push('applicableMonths 는 배열 또는 null');
  }

  if (body.discountRate !== undefined) {
    if (body.discountRate === null || body.discountRate === '') patch.discountRate = null;
    else {
      const r = Number(body.discountRate);
      if (!Number.isFinite(r) || r <= 0 || r >= 1) errors.push('discountRate 0~1');
      else patch.discountRate = r.toFixed(4);
    }
  }

  if (body.freeMonths !== undefined) {
    if (body.freeMonths === null || body.freeMonths === '') patch.freeMonths = null;
    else {
      const f = Number(body.freeMonths);
      if (!Number.isInteger(f) || f < 1) errors.push('freeMonths 1 이상');
      else patch.freeMonths = f;
    }
  }

  if (body.discountAmount !== undefined) {
    if (body.discountAmount === null || body.discountAmount === '') patch.discountAmount = null;
    else {
      const a = Number(body.discountAmount);
      if (!Number.isInteger(a) || a < 0) errors.push('discountAmount 0 이상 정수');
      else patch.discountAmount = a;
    }
  }

  if (body.monthlySchedule !== undefined) {
    if (body.monthlySchedule === null) patch.monthlySchedule = null;
    else if (Array.isArray(body.monthlySchedule)) {
      const seen = new Set<number>();
      const out: { months: number[]; rate: number }[] = [];
      for (const [idx, entryRaw] of body.monthlySchedule.entries()) {
        if (!entryRaw || typeof entryRaw !== 'object') {
          errors.push(`monthlySchedule[${idx}] 형식 오류`);
          continue;
        }
        const entry = entryRaw as { months?: unknown; rate?: unknown };
        const monthsArr = Array.isArray(entry.months)
          ? entry.months.map(Number).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 12 && !seen.has(n))
          : [];
        const rate = Number(entry.rate);
        if (monthsArr.length === 0) { errors.push(`monthlySchedule[${idx}] 적용 월 필수`); continue; }
        if (!Number.isFinite(rate) || rate <= 0 || rate >= 1) { errors.push(`monthlySchedule[${idx}] rate 0~1`); continue; }
        for (const m of monthsArr) seen.add(m);
        out.push({ months: monthsArr.sort((a: number, b: number) => a - b), rate });
      }
      patch.monthlySchedule = out.length > 0 ? out : null;
    } else errors.push('monthlySchedule 배열 또는 null');
  }

  if (body.startsAt !== undefined) {
    if (body.startsAt === null || body.startsAt === '') patch.startsAt = null;
    else {
      const d = new Date(body.startsAt);
      if (isNaN(d.getTime())) errors.push('startsAt 형식 오류');
      else patch.startsAt = d;
    }
  }

  if (body.endsAt !== undefined) {
    if (body.endsAt === null || body.endsAt === '') patch.endsAt = null;
    else {
      const d = new Date(body.endsAt);
      if (isNaN(d.getTime())) errors.push('endsAt 형식 오류');
      else patch.endsAt = d;
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
  }

  await db.update(promotions).set(patch).where(eq(promotions.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const existing = await db.query.promotions.findFirst({
    where: eq(promotions.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: '프로모션을 찾을 수 없습니다' }, { status: 404 });
  }
  await db.delete(promotions).where(eq(promotions.id, id));
  return NextResponse.json({ success: true });
}
