import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { authSessions, customers } from '../../../../../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '이름을 입력해 주세요' }, { status: 400 });
    }

    // 세션 확인
    const cookieStore = await cookies();
    const tokenValue = cookieStore.get('haam_session')?.value;
    if (!tokenValue) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const session = await db.query.authSessions.findFirst({
      where: and(
        eq(authSessions.token, tokenValue),
        gt(authSessions.expiresAt, new Date()),
      ),
    });

    if (!session) {
      return NextResponse.json({ error: '세션이 만료되었습니다' }, { status: 401 });
    }

    // 이미 등록된 경우 방지
    if (session.customerId) {
      return NextResponse.json({ error: '이미 등록된 사용자입니다' }, { status: 400 });
    }

    // 고객 생성
    const [customer] = await db.insert(customers).values({
      name: name.trim(),
      phone: session.phone,
    }).returning();

    // 세션에 customerId 연결
    await db.update(authSessions)
      .set({ customerId: customer.id })
      .where(eq(authSessions.id, session.id));

    return NextResponse.json({
      success: true,
      customerName: customer.name,
    });
  } catch (error) {
    console.error('[register] Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
