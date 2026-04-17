/**
 * Solapi SMS 발송 (OTP 인증번호용)
 *
 * alimtalk.ts의 인증 헤더 방식을 재사용하되,
 * 카카오 알림톡이 아닌 일반 SMS를 발송한다.
 */

import crypto from 'crypto';

function getAuthHeader(): string {
  const apiKey = process.env.SOLAPI_API_KEY!;
  const apiSecret = process.env.SOLAPI_API_SECRET!;
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(8).toString('hex');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex');

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export async function sendSmsOtp(phone: string, code: string): Promise<boolean> {
  const senderNumber = process.env.SOLAPI_SENDER_NUMBER!;

  try {
    const res = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        message: {
          to: phone,
          from: senderNumber,
          type: 'SMS',
          text: `[HAAM] 인증번호 ${code}`,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[SMS] Send failed:', res.status, err);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[SMS] Network error:', error);
    return false;
  }
}

export function generateOtpCode(): string {
  const first = Math.floor(Math.random() * 9) + 1; // 1-9
  const rest = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${first}${rest}`;
}
