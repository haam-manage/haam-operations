/**
 * 토스페이먼츠 결제 유틸리티
 *
 * 참조: .claude/skills/toss-payments/SKILL.md
 * v1: 카드 + 간편결제만 (가상계좌 미지원)
 */

// ─────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────

export interface CreateOrderInput {
  orderId: string;
  orderName: string;       // "도심창고:함 M01 보관함 3개월"
  amount: number;          // 총 결제금액 (렌탈 + 보증금)
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}

export interface TossConfirmResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  method: string;
  totalAmount: number;
  receipt?: { url: string };
  failure?: { code: string; message: string };
}

export interface TossWebhookPayload {
  eventType: string;       // "PAYMENT_STATUS_CHANGED"
  data: {
    paymentKey: string;
    orderId: string;
    status: string;        // "DONE", "CANCELED", "ABORTED" 등
    method: string;
    totalAmount: number;
    receipt?: { url: string };
  };
}

// ─────────────────────────────────────────
// 결제 확인 API (서버 → 토스)
// ─────────────────────────────────────────

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

function getAuthHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY!;
  const encoded = Buffer.from(`${secretKey}:`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * 결제 확인 (Payment Confirm)
 * 프론트에서 결제 완료 후 서버에서 최종 확인
 */
export async function confirmPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<TossConfirmResponse> {
  const res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new TossPaymentError(
      error.code || 'UNKNOWN',
      error.message || '결제 확인 실패',
    );
  }

  return res.json();
}

/**
 * 결제 취소 (환불)
 */
export async function cancelPayment(
  paymentKey: string,
  cancelReason: string,
  cancelAmount?: number,
): Promise<TossConfirmResponse> {
  const body: Record<string, unknown> = { cancelReason };
  if (cancelAmount !== undefined) body.cancelAmount = cancelAmount;

  const res = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new TossPaymentError(
      error.code || 'UNKNOWN',
      error.message || '결제 취소 실패',
    );
  }

  return res.json();
}

// ─────────────────────────────────────────
// 웹훅 서명 검증
// ─────────────────────────────────────────

/**
 * 토스 웹훅 서명 검증 (HMAC-SHA256)
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
): Promise<boolean> {
  const secret = process.env.TOSS_WEBHOOK_SECRET;
  if (!secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = Buffer.from(sig).toString('base64');
  return computed === signature;
}

// ─────────────────────────────────────────
// 주문 ID 생성
// ─────────────────────────────────────────

/**
 * 고유 주문 ID 생성 (HAAM-YYYYMMDD-랜덤6자리)
 */
export function generateOrderId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `HAAM-${y}${m}${d}-${rand}`;
}

// ─────────────────────────────────────────
// 에러 클래스
// ─────────────────────────────────────────

export class TossPaymentError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'TossPaymentError';
  }
}
