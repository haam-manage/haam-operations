/**
 * 텔레그램 보고 채널
 *
 * 이벤트 알림 + 일일 요약 리포트 발송
 * GAS 원본: legacy-gas/TelegramService.gs (보고 기능만 이관, OCR 제거)
 */

// ─────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────

export type TelegramEventType =
  | 'new_contract'
  | 'contract_extended'
  | 'payment_complete'
  | 'qr_registered'
  | 'qr_failed'
  | 'co_user_registered'
  | 'deposit_refund_registered'
  | 'batch_complete'
  | 'batch_failed'
  | 'payment_webhook_failed'
  | 'alimtalk_failed'
  | 'error';

// ─────────────────────────────────────────
// 메시지 발송
// ─────────────────────────────────────────

const TELEGRAM_API = 'https://api.telegram.org';

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Telegram] BOT_TOKEN 또는 CHAT_ID 미설정');
    return false;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('[Telegram] 발송 실패:', err);
    return false;
  }
}

// ─────────────────────────────────────────
// 이벤트 알림 (실시간)
// ─────────────────────────────────────────

export async function notifyEvent(
  type: TelegramEventType,
  details: Record<string, string | number>,
): Promise<void> {
  const emoji = EVENT_EMOJI[type] || '📋';
  const title = EVENT_TITLE[type] || type;

  const lines = [`${emoji} <b>${title}</b>`];
  for (const [key, value] of Object.entries(details)) {
    lines.push(`• ${key}: ${value}`);
  }

  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  lines.push(`\n🕐 ${now}`);

  await sendTelegramMessage(lines.join('\n'));
}

const EVENT_EMOJI: Record<TelegramEventType, string> = {
  new_contract: '📝',
  contract_extended: '🔁',
  payment_complete: '💳',
  qr_registered: '✅',
  qr_failed: '❌',
  co_user_registered: '👤',
  deposit_refund_registered: '🏦',
  batch_complete: '⏰',
  batch_failed: '🚨',
  payment_webhook_failed: '⚠️',
  alimtalk_failed: '📱',
  error: '🔴',
};

const EVENT_TITLE: Record<TelegramEventType, string> = {
  new_contract: '신규 계약',
  contract_extended: '계약 수동 변경',
  payment_complete: '결제 완료',
  qr_registered: 'QR 등록 완료',
  qr_failed: 'QR 등록 실패',
  co_user_registered: '공동사용자 등록',
  deposit_refund_registered: '보증금 반환 계좌 등록',
  batch_complete: '일일 배치 완료',
  batch_failed: '배치 실행 실패',
  payment_webhook_failed: '결제 웹훅 처리 실패',
  alimtalk_failed: '알림톡 발송 실패',
  error: '시스템 오류',
};

// ─────────────────────────────────────────
// 일일 요약 리포트 (21:00 KST)
// ─────────────────────────────────────────

export interface DailySummary {
  date: string;            // YYYY-MM-DD
  newContracts: number;
  expiredContracts: number;
  renewedContracts: number;
  totalRevenue: number;
  expiringTomorrow: string[];  // 보관함 번호 목록
  overdueCount: number;
  availableCabinets: number;
}

export async function sendDailySummary(summary: DailySummary): Promise<void> {
  const lines = [
    `📊 <b>일일 운영 요약 — ${summary.date}</b>`,
    '',
    `📝 신규 계약: ${summary.newContracts}건`,
    `🔚 종료: ${summary.expiredContracts}건`,
    `🔄 재계약: ${summary.renewedContracts}건`,
    `💰 매출: ₩${summary.totalRevenue.toLocaleString()}`,
    '',
    `⏰ 내일 만료 예정: ${summary.expiringTomorrow.length}건`,
  ];

  if (summary.expiringTomorrow.length > 0) {
    lines.push(`  → ${summary.expiringTomorrow.join(', ')}`);
  }

  lines.push(
    `⚠️ 연체 현황: ${summary.overdueCount}건`,
    `📦 빈 보관함: ${summary.availableCabinets}개 / 61개`,
  );

  await sendTelegramMessage(lines.join('\n'));
}
