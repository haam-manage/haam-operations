import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { promotions, promotionTypeEnum, cabinetSizeEnum } from '../../../../../db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type PromotionType = (typeof promotionTypeEnum.enumValues)[number];
type CabinetSize = (typeof cabinetSizeEnum.enumValues)[number];

function parseBody(body: any) {
  const errors: string[] = [];
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) errors.push('name 필수');
  if (name.length > 100) errors.push('name 100자 이내');

  const type = body?.type as PromotionType;
  if (!['discount_rate', 'free_months', 'fixed_discount'].includes(type)) errors.push('type 필수(discount_rate|free_months|fixed_discount)');

  const isActive = typeof body?.isActive === 'boolean' ? body.isActive : false;
  const priority = Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 0;
  const isNewOnly = typeof body?.isNewOnly === 'boolean' ? body.isNewOnly : false;

  const sizes = Array.isArray(body?.applicableSizes) ? body.applicableSizes.filter((s: unknown) => s === 'M' || s === 'L' || s === 'XL') as CabinetSize[] : null;
  const applicableSizes = sizes && sizes.length > 0 ? sizes : null;

  const months = Array.isArray(body?.applicableMonths) ? body.applicableMonths.map(Number).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 12) : null;
  const applicableMonths = months && months.length > 0 ? months : null;

  let discountRate: string | null = null;
  if (type === 'discount_rate') {
    const r = Number(body?.discountRate);
    if (!Number.isFinite(r) || r <= 0 || r >= 1) errors.push('discountRate 는 0~1 사이 값 (예: 0.15)');
    else discountRate = r.toFixed(4);
  }

  let freeMonths: number | null = null;
  if (type === 'free_months') {
    const f = Number(body?.freeMonths);
    if (!Number.isInteger(f) || f < 1) errors.push('freeMonths 는 1 이상 정수');
    else freeMonths = f;
  }

  let discountAmount: number | null = null;
  if (type === 'fixed_discount') {
    const a = Number(body?.discountAmount);
    if (!Number.isInteger(a) || a < 0) errors.push('discountAmount 는 0 이상 정수(원)');
    else discountAmount = a;
  }

  const startsAt = body?.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body?.endsAt ? new Date(body.endsAt) : null;
  if (startsAt && isNaN(startsAt.getTime())) errors.push('startsAt 날짜 형식 오류');
  if (endsAt && isNaN(endsAt.getTime())) errors.push('endsAt 날짜 형식 오류');

  return {
    errors,
    values: {
      name, type, isActive, priority, isNewOnly,
      applicableSizes, applicableMonths,
      discountRate, freeMonths, discountAmount,
      startsAt, endsAt,
    },
  };
}

export async function GET() {
  const rows = await db
    .select()
    .from(promotions)
    .orderBy(desc(promotions.priority), desc(promotions.createdAt));
  return NextResponse.json({ promotions: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { errors, values } = parseBody(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
  }

  const [created] = await db
    .insert(promotions)
    .values(values)
    .returning();
  return NextResponse.json({ promotion: created }, { status: 201 });
}
