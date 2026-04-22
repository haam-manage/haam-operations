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
  if (!['discount_rate', 'free_months', 'fixed_discount', 'per_month_schedule'].includes(type)) {
    errors.push('type 필수(discount_rate|free_months|fixed_discount|per_month_schedule)');
  }

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

  let monthlySchedule: { months: number[]; rate: number }[] | null = null;
  if (type === 'per_month_schedule') {
    const parsed = parseMonthlySchedule(body?.monthlySchedule, errors);
    monthlySchedule = parsed;
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
      discountRate, freeMonths, discountAmount, monthlySchedule,
      startsAt, endsAt,
    },
  };
}

/**
 * 입력 예: [{ months: [1], rate: 0.5 }, { months: [2,3], rate: 0.2 }]
 * - months: 1~12 정수 배열, 비어있으면 해당 행 제거
 * - rate: 0 < rate < 1
 * - 월 중복 허용 안 함 (첫 번째 정의 우선, 이후 행에서 중복된 월 자동 제거)
 */
function parseMonthlySchedule(raw: unknown, errors: string[]): { months: number[]; rate: number }[] | null {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push('monthlySchedule 는 최소 1개 구간 필요');
    return null;
  }
  const seen = new Set<number>();
  const result: { months: number[]; rate: number }[] = [];
  for (const [idx, entryRaw] of raw.entries()) {
    if (!entryRaw || typeof entryRaw !== 'object') {
      errors.push(`monthlySchedule[${idx}] 형식 오류`);
      continue;
    }
    const entry = entryRaw as { months?: unknown; rate?: unknown };
    const monthsArr = Array.isArray(entry.months)
      ? entry.months.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 12 && !seen.has(n))
      : [];
    const rate = Number(entry.rate);
    if (monthsArr.length === 0) {
      errors.push(`monthlySchedule[${idx}] 적용 월 필수(1~12, 중복 제외)`);
      continue;
    }
    if (!Number.isFinite(rate) || rate <= 0 || rate >= 1) {
      errors.push(`monthlySchedule[${idx}] rate 는 0~1 사이 값`);
      continue;
    }
    for (const m of monthsArr) seen.add(m);
    result.push({ months: monthsArr.sort((a, b) => a - b), rate });
  }
  return result.length > 0 ? result : null;
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
