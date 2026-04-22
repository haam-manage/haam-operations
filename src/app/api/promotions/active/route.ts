import { NextResponse } from 'next/server';
import { getActivePromotion } from '../../../../../lib/promotions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const promo = await getActivePromotion();
  return NextResponse.json({
    active: promo !== null,
    name: promo?.name ?? null,
  });
}
