import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { banners } from '../../../../../db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function parseBody(body: any) {
  const errors: string[] = [];

  const labelRaw = typeof body?.label === 'string' ? body.label.trim() : '';
  if (!labelRaw) errors.push('label 필수');
  if (labelRaw.length > 100) errors.push('label 100자 이내');

  const isActive = typeof body?.isActive === 'boolean' ? body.isActive : true;
  const priority = Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 0;

  let startsAt: Date | null = null;
  if (body?.startsAt) {
    const d = new Date(body.startsAt);
    if (isNaN(d.getTime())) errors.push('startsAt 날짜 형식 오류');
    else startsAt = d;
  }

  let endsAt: Date | null = null;
  if (body?.endsAt) {
    const d = new Date(body.endsAt);
    if (isNaN(d.getTime())) errors.push('endsAt 날짜 형식 오류');
    else endsAt = d;
  }

  return {
    errors,
    values: { label: labelRaw, isActive, priority, startsAt, endsAt },
  };
}

export async function GET() {
  const rows = await db
    .select()
    .from(banners)
    .orderBy(desc(banners.priority), desc(banners.createdAt));
  return NextResponse.json({ banners: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { errors, values } = parseBody(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
  }

  const [created] = await db.insert(banners).values(values).returning();
  return NextResponse.json({ banner: created }, { status: 201 });
}
