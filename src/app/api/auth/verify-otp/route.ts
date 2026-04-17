import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { phoneOtps, authSessions, customers } from '../../../../../db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { phone, code, name } = await req.json();

    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone || !code) {
      return NextResponse.json({ error: '전화번호와 인증번호를 입력해 주세요' }, { status: 400 });
    }

    // 최신 OTP 조회 (미만료 + 미인증)
    const otp = await db.query.phoneOtps.findFirst({
      where: and(
        eq(phoneOtps.phone, cleanPhone),
        eq(phoneOtps.verified, false),
        gt(phoneOtps.expiresAt, new Date()),
      ),
      orderBy: [desc(phoneOtps.createdAt)],
    });

    if (!otp) {
      return NextResponse.json({ error: '인증번호가 만료되었습니다. 다시 요청해 주세요.' }, { status: 400 });
    }

    // 시도 횟수 체크
    if (otp.attempts >= 5) {
      return NextResponse.json({ error: '인증 시도 횟수를 초과했습니다. 다시 요청해 주세요.' }, { status: 429 });
    }

    // 시도 횟수 증가
    await db.update(phoneOtps)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(phoneOtps.id, otp.id));

    // 코드 확인
    if (otp.code !== code) {
      return NextResponse.json({ error: '인증번호가 올바르지 않습니다' }, { status: 400 });
    }

    // 인증 완료
    await db.update(phoneOtps)
      .set({ verified: true })
      .where(eq(phoneOtps.id, otp.id));

    // 기존 고객 확인
    let customer = await db.query.customers.findFirst({
      where: eq(customers.phone, cleanPhone),
    });

    // 신규 고객: 이름이 제공되었으면 즉시 생성
    const isNewUser = !customer;
    if (!customer && name && name.trim()) {
      const [newCustomer] = await db.insert(customers).values({
        name: name.trim(),
        phone: cleanPhone,
      }).returning();
      customer = newCustomer;
    }

    // 세션 생성 (90일)
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const [session] = await db.insert(authSessions).values({
      customerId: customer?.id ?? null,
      phone: cleanPhone,
      expiresAt,
    }).returning();

    // lastLoginAt 업데이트
    if (customer) {
      await db.update(customers)
        .set({ lastLoginAt: new Date() })
        .where(eq(customers.id, customer.id));
    }

    // 쿠키 설정
    const response = NextResponse.json({
      success: true,
      isNewUser,
      customerName: customer?.name ?? null,
    });

    response.cookies.set('haam_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60, // 90일
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[verify-otp] Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
