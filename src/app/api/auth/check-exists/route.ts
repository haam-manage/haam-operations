import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { customers } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    const cleanPhone = (phone || '').replace(/\D/g, '');

    if (!cleanPhone.match(/^01[016789]\d{7,8}$/)) {
      return NextResponse.json({ error: '올바른 전화번호를 입력해 주세요' }, { status: 400 });
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.phone, cleanPhone),
    });

    return NextResponse.json({
      exists: !!customer,
      name: customer?.name ?? null,
    });
  } catch (error) {
    console.error('[check-exists] Error:', error);
    const debug = process.env.VERCEL_ENV !== 'production'
      ? { detail: error instanceof Error ? error.message : String(error) }
      : {};
    return NextResponse.json({ error: '서버 오류가 발생했습니다', ...debug }, { status: 500 });
  }
}
