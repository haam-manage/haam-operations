import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../db';
import { promotions } from '../../../../../../db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/promotions/:id
 * body: { isActive: boolean }
 * 프로모션 활성/비활성 토글. 단순 플래그 변경만 지원.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { isActive } = body as { isActive?: boolean };

  if (typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive(boolean) 필수' }, { status: 400 });
  }

  const existing = await db.query.promotions.findFirst({
    where: eq(promotions.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: '프로모션을 찾을 수 없습니다' }, { status: 404 });
  }

  await db
    .update(promotions)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(promotions.id, id));

  return NextResponse.json({ success: true, isActive });
}
