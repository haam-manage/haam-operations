import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../db';
import { banners } from '../../../../../../db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/banners/:id
 * body 에 포함된 필드만 부분 업데이트.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const existing = await db.query.banners.findFirst({
    where: eq(banners.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: '배너를 찾을 수 없습니다' }, { status: 404 });
  }

  const patch: Partial<typeof banners.$inferInsert> = { updatedAt: new Date() };
  const errors: string[] = [];

  if (typeof body.label === 'string') {
    const s = body.label.trim();
    if (!s || s.length > 100) errors.push('label 1~100자');
    else patch.label = s;
  }
  if (typeof body.isActive === 'boolean') patch.isActive = body.isActive;
  if (Number.isFinite(Number(body.priority))) patch.priority = Number(body.priority);

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

  await db.update(banners).set(patch).where(eq(banners.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const existing = await db.query.banners.findFirst({
    where: eq(banners.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: '배너를 찾을 수 없습니다' }, { status: 404 });
  }
  await db.delete(banners).where(eq(banners.id, id));
  return NextResponse.json({ success: true });
}
