/**
 * Solapi 알림톡 발송 서비스
 *
 * 참조: .claude/skills/solapi-caller/SKILL.md
 * GAS 원본: legacy-gas/AlimtalkService.gs
 */

import crypto from 'crypto';

// ─────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────

export interface SendAlimtalkInput {
  templateId: string;
  recipientPhone: string;
  variables: Record<string, string>;
  contractId?: string;
}

export interface SendAlimtalkResult {
  success: boolean;
  resultId?: string;
  errorMessage?: string;
}

// ─────────────────────────────────────────
// 템플릿 ID 상수
// ─────────────────────────────────────────

export const TEMPLATE_IDS = {
  OTP_AUTH:              'KA01TP260417040815377WEI0ywvsDkq',
  VISIT_CONFIRM:         'KA01TP260319083213962X1nqM6ujxhP',
  CONTRACT_RESERVATION:  'KA01TP260222235233515FtWm3CNVkwp',
  CONTRACT_PAYMENT:      'KA01TP260223005507374rBSS64NruUq',
  CONTRACT_MONTH_CHANGE: 'KA01TP260427070619776cRNHWbgbaWN',
  CO_USER_REGISTER:      'KA01TP260316154204906cKwlP2Ej2ib',
  CO_USER_INVITE:        'KA01TP260320011320285dBxZ1N7OjIw',
  CO_USER_CONFIRM:       'KA01TP260320011655252MdTQq4X5mIK',
  CABINET_ERROR:         'KA01TP260326060335391Egsp7T9gUuA',
  EXPIRY_D7:             'KA01TP2602230804393738zbazmzrEba',
  EXPIRY_D0:             'KA01TP260326100350885RD4ZXEUYLeg',
  OVERDUE_D1:            '', // 미등록 — Solapi 심사 후 업데이트 필요
  OVERDUE_D3:            '', // 미등록
  OVERDUE_D7:            '', // 미등록
} as const;

// ─────────────────────────────────────────
// Solapi HMAC-SHA256 인증
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
// 알림톡 발송
// ─────────────────────────────────────────

const SOLAPI_API_URL = 'https://api.solapi.com/messages/v4/send';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 10000, 60000]; // 지수 백오프

export async function sendAlimtalk(input: SendAlimtalkInput): Promise<SendAlimtalkResult> {
  const { templateId, recipientPhone, variables } = input;

  if (!templateId) {
    return { success: false, errorMessage: '템플릿 ID가 비어있습니다 (미등록 템플릿)' };
  }

  const senderNumber = process.env.SOLAPI_SENDER_NUMBER!;
  const pfId = process.env.SOLAPI_PFID!;

  const messageBody = {
    message: {
      to: recipientPhone,
      from: senderNumber,
      type: 'ATA', // 알림톡 타입 명시 (Solapi가 변수 치환 처리)
      kakaoOptions: {
        pfId,
        templateId,
        variables,
      },
    },
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 디버그 로그: 요청 페이로드
      console.log('[alimtalk] Request to Solapi:', JSON.stringify(messageBody));

      const res = await fetch(SOLAPI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageBody),
      });

      const data = await res.json();

      // 디버그 로그: 전체 응답
      console.log('[alimtalk] Response status:', res.status);
      console.log('[alimtalk] Response body:', JSON.stringify(data));

      if (res.ok) {
        return {
          success: true,
          resultId: data.groupId || data.messageId || 'ok',
        };
      }

      // 재시도 불가능한 오류 (인증 실패, 잘못된 요청)
      if (res.status === 401 || res.status === 403 || res.status === 400) {
        return {
          success: false,
          errorMessage: `[${res.status}] ${data.errorMessage || data.message || '발송 실패'}`,
        };
      }

      // 재시도 가능한 오류 (서버 오류, 레이트리밋)
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }

      return {
        success: false,
        errorMessage: `${MAX_RETRIES}회 재시도 후 실패: [${res.status}] ${data.errorMessage || ''}`,
      };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      return {
        success: false,
        errorMessage: `네트워크 오류: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return { success: false, errorMessage: '예기치 않은 오류' };
}

// ─────────────────────────────────────────
// 편의 함수들
// ─────────────────────────────────────────

/**
 * 결제 완료 알림톡 발송
 */
export async function sendPaymentCompleteAlimtalk(params: {
  phone: string;
  customerName: string;
  cabinetNumber: string;
  securityCode: string;
  startDate: string;
  expiryDate: string;
  contractId?: string;
}): Promise<SendAlimtalkResult> {
  return sendAlimtalk({
    templateId: TEMPLATE_IDS.CONTRACT_PAYMENT,
    recipientPhone: params.phone,
    variables: {
      '#{고객명}': params.customerName,
      '#{보관함번호}': params.cabinetNumber,
      '#{보안코드}': params.securityCode,
      '#{시작일}': params.startDate,
      '#{만료일}': params.expiryDate,
    },
    contractId: params.contractId,
  });
}

/**
 * 만료 D-7 알림톡 발송
 */
export async function sendExpiryD7Alimtalk(params: {
  phone: string;
  customerName: string;
  cabinetNumber: string;
  expiryDate: string;
  renewUrl: string;
  contractId?: string;
}): Promise<SendAlimtalkResult> {
  return sendAlimtalk({
    templateId: TEMPLATE_IDS.EXPIRY_D7,
    recipientPhone: params.phone,
    variables: {
      '#{고객명}': params.customerName,
      '#{보관함번호}': params.cabinetNumber,
      '#{만료일}': params.expiryDate,
      '#{재계약링크}': params.renewUrl,
    },
    contractId: params.contractId,
  });
}

/**
 * 만료 D-0 알림톡 발송
 */
export async function sendExpiryD0Alimtalk(params: {
  phone: string;
  customerName: string;
  cabinetNumber: string;
  refundUrl: string;
  contractId?: string;
}): Promise<SendAlimtalkResult> {
  return sendAlimtalk({
    templateId: TEMPLATE_IDS.EXPIRY_D0,
    recipientPhone: params.phone,
    variables: {
      '#{고객명}': params.customerName,
      '#{보관함번호}': params.cabinetNumber,
      '#{반환계좌등록링크}': params.refundUrl,
    },
    contractId: params.contractId,
  });
}

/**
 * OTP 인증번호 알림톡 발송
 */
export async function sendOtpAlimtalk(params: {
  phone: string;
  code: string;
}): Promise<SendAlimtalkResult> {
  return sendAlimtalk({
    templateId: TEMPLATE_IDS.OTP_AUTH,
    recipientPhone: params.phone,
    variables: {
      '#{code}': params.code,
    },
  });
}

/**
 * 계약 기간 변경 알림톡 발송 (관리자 수동 연장 등)
 *
 * Solapi 템플릿(CONTRACT_MONTH_CHANGE) 변수와 1:1 매칭.
 * 추가결제금액은 천 단위 콤마 포함 정수 문자열로 전달.
 */
export async function sendContractExtendAlimtalk(params: {
  phone: string;
  customerName: string;
  cabinetNumber: string;
  startDate: string;
  oldExpiryDate: string;
  newExpiryDate: string;
  additionalPayment: number;
  contractId?: string;
}): Promise<SendAlimtalkResult> {
  return sendAlimtalk({
    templateId: TEMPLATE_IDS.CONTRACT_MONTH_CHANGE,
    recipientPhone: params.phone,
    variables: {
      '#{고객명}': params.customerName,
      '#{보관함번호}': params.cabinetNumber,
      '#{기존계약일}': params.startDate,
      '#{기존만료일}': params.oldExpiryDate,
      '#{변경만료일}': params.newExpiryDate,
      '#{추가결제금액}': params.additionalPayment.toLocaleString(),
    },
    contractId: params.contractId,
  });
}

/**
 * 공동사용자 초대 알림톡 발송
 */
export async function sendCoUserInviteAlimtalk(params: {
  phone: string;
  primaryUserName: string;
  cabinetNumber: string;
  inviteUrl: string;
  contractId?: string;
}): Promise<SendAlimtalkResult> {
  return sendAlimtalk({
    templateId: TEMPLATE_IDS.CO_USER_INVITE,
    recipientPhone: params.phone,
    variables: {
      '#{대표자명}': params.primaryUserName,
      '#{보관함번호}': params.cabinetNumber,
      '#{초대링크}': params.inviteUrl,
    },
    contractId: params.contractId,
  });
}

// ─────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
