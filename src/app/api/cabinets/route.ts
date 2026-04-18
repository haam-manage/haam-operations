import { NextResponse } from 'next/server';
import { db } from '../../../../db';
import { cabinets } from '../../../../db/schema';

export async function GET() {
  const rows = await db
    .select({
      number: cabinets.number,
      size: cabinets.size,
      isAvailable: cabinets.isAvailable,
    })
    .from(cabinets);

  return NextResponse.json(
    { cabinets: rows },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
