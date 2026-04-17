import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../db';
import { customers, authSessions } from '../../../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || '/my';
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${origin}/auth?error=kakao_cancel`);
  }

  try {
    const clientId = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY!;
    const clientSecret = process.env.KAKAO_CLIENT_SECRET;
    const redirectUri = `${origin}/api/auth/kakao/callback`;

    // 1. code → access_token
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
        redirect_uri: redirectUri,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[kakao] Token error:', tokenData);
      return NextResponse.redirect(`${origin}/auth?error=kakao_token`);
    }

    // 2. access_token → 사용자 정보
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();
    if (!userRes.ok) {
      console.error('[kakao] User info error:', userData);
      return NextResponse.redirect(`${origin}/auth?error=kakao_user`);
    }

    const kakaoAccount = userData.kakao_account || {};
    const name: string = kakaoAccount.name || kakaoAccount.profile?.nickname || '카카오 사용자';
    let phoneNumber: string | null = kakaoAccount.phone_number || null;

    // 카카오 전화번호 형식: "+82 10-1234-5678" → "01012345678"
    if (phoneNumber) {
      phoneNumber = phoneNumber.replace(/\D/g, '');
      if (phoneNumber.startsWith('82')) {
        phoneNumber = '0' + phoneNumber.slice(2);
      }
    }

    if (!phoneNumber) {
      return NextResponse.redirect(`${origin}/auth?error=kakao_no_phone`);
    }

    // 3. customers upsert (전화번호 기준)
    let customer = await db.query.customers.findFirst({
      where: eq(customers.phone, phoneNumber),
    });

    if (!customer) {
      const [newCustomer] = await db.insert(customers).values({
        name,
        phone: phoneNumber,
      }).returning();
      customer = newCustomer;
    } else {
      await db.update(customers)
        .set({ lastLoginAt: new Date() })
        .where(eq(customers.id, customer.id));
    }

    // 4. 세션 생성 (90일)
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const [session] = await db.insert(authSessions).values({
      customerId: customer.id,
      phone: phoneNumber,
      expiresAt,
    }).returning();

    // 5. 쿠키 설정 + 리다이렉트
    const response = NextResponse.redirect(`${origin}${state}`);
    response.cookies.set('haam_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[kakao callback] Error:', err);
    return NextResponse.redirect(`${origin}/auth?error=server`);
  }
}
