import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { phoneOtps } from '../../../../../db/schema';
import { eq, gt, and } from 'drizzle-orm';
import { sendOtpAlimtalk } from '../../../../../lib/alimtalk';
import { sendSmsOtp } from '../../../../../lib/sms';

function generateOtpCode(): string {
  const first = Math.floor(Math.random() * 9) + 1; // 1-9
  const rest = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${first}${rest}`;
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    // 전화번호 검증
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone.match(/^01[016789]\d{7,8}$/)) {
      return NextResponse.json({ error: '올바른 전화번호를 입력해 주세요' }, { status: 400 });
    }

    // 레이트 리밋: 1분 내 재요청 방지
    const recentOtp = await db.query.phoneOtps.findFirst({
      where: and(
        eq(phoneOtps.phone, cleanPhone),
        gt(phoneOtps.createdAt, new Date(Date.now() - 60 * 1000)),
      ),
    });

    if (recentOtp) {
      return NextResponse.json({ error: '잠시 후 다시 시도해 주세요' }, { status: 429 });
    }

    // OTP 생성 + 저장
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3분

    await db.insert(phoneOtps).values({
      phone: cleanPhone,
      code,
      expiresAt,
    });

    // 알림톡 발송 시도 (카카오톡 채널명으로 표시, 개인 번호 노출 없음)
    const alimtalkResult = await sendOtpAlimtalk({ phone: cleanPhone, code });

    if (alimtalkResult.success) {
      return NextResponse.json({ success: true, expiresIn: 180, channel: 'alimtalk' });
    }

    // 알림톡 실패 → SMS fallback (템플릿 승인 대기 중 임시 대응)
    console.warn('[send-otp] Alimtalk failed, fallback to SMS:', alimtalkResult.errorMessage);
    const smsSent = await sendSmsOtp(cleanPhone, code);
    if (!smsSent) {
      return NextResponse.json({
        error: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, expiresIn: 180, channel: 'sms' });
  } catch (error) {
    console.error('[send-otp] Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
