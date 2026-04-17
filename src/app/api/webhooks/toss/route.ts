import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { payments, contracts, cabinets, customers, qrQueue } from '../../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyWebhookSignature, type TossWebhookPayload } from '../../../../../lib/toss';
import { sendPaymentCompleteAlimtalk } from '../../../../../lib/alimtalk';
import { notifyEvent } from '../../../../../lib/telegram';

export async function POST(request: NextRequest) {
  const body = await request.text();

  // 1. 서명 검증
  const signature = request.headers.get('TossPayments-Signature') || '';
  if (process.env.TOSS_WEBHOOK_SECRET) {
    const valid = await verifyWebhookSignature(body, signature);
    if (!valid) {
      await notifyEvent('payment_webhook_failed', { reason: '서명 검증 실패' });
      return NextResponse.json({ error: '서명 검증 실패' }, { status: 400 });
    }
  }

  let payload: TossWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: '잘못된 JSON' }, { status: 400 });
  }

  const { data } = payload;

  // 2. 멱등성 체크 — 이미 처리된 결제인지 확인
  const existingPayment = await db.query.payments.findFirst({
    where: and(
      eq(payments.orderId, data.orderId),
      eq(payments.status, 'completed'),
    ),
  });

  if (existingPayment) {
    return NextResponse.json({ message: '이미 처리됨' }, { status: 200 });
  }

  // 3. 결제 레코드 찾기
  const payment = await db.query.payments.findFirst({
    where: eq(payments.orderId, data.orderId),
  });

  if (!payment) {
    await notifyEvent('payment_webhook_failed', {
      orderId: data.orderId,
      reason: '주문을 찾을 수 없음',
    });
    return NextResponse.json({ error: '주문 없음' }, { status: 404 });
  }

  // 4. 결제 상태에 따라 처리
  if (data.status === 'DONE') {
    // 금액 검증
    if (data.totalAmount !== payment.amount) {
      await db.update(payments)
        .set({
          status: 'failed',
          failReason: `금액 불일치: 예상 ${payment.amount} vs 실제 ${data.totalAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      await notifyEvent('payment_webhook_failed', {
        orderId: data.orderId,
        reason: `금액 불일치: ${payment.amount} vs ${data.totalAmount}`,
      });

      return NextResponse.json({ error: '금액 불일치' }, { status: 400 });
    }

    // 결제 완료 처리
    await db.update(payments)
      .set({
        status: 'completed',
        paymentKey: data.paymentKey,
        method: data.method,
        receiptUrl: data.receipt?.url,
        webhookReceivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // 계약 활성화
    const contract = await db.query.contracts.findFirst({
      where: eq(contracts.id, payment.contractId),
      with: { customer: true, cabinet: true },
    });

    if (contract) {
      await db.update(contracts)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(contracts.id, contract.id));

      // 보관함 사용중 표시
      await db.update(cabinets)
        .set({ isAvailable: false })
        .where(eq(cabinets.id, contract.cabinetId));

      // QR 등록 대기열에 추가
      await db.insert(qrQueue).values({
        contractId: contract.id,
        cabinetNumber: contract.cabinet!.number,
        securityCode: contract.securityCode,
        userName: contract.customer!.name,
        userType: 'primary',
        status: 'pending',
      });

      // 알림톡 발송
      await sendPaymentCompleteAlimtalk({
        phone: contract.customer!.phone,
        customerName: contract.customer!.name,
        cabinetNumber: contract.cabinet!.number,
        securityCode: contract.securityCode,
        startDate: contract.startDate,
        expiryDate: contract.expiryDate,
        contractId: contract.id,
      });

      // 텔레그램 알림
      await notifyEvent('payment_complete', {
        고객: contract.customer!.name,
        보관함: contract.cabinet!.number,
        금액: `₩${data.totalAmount.toLocaleString()}`,
      });
    }

    return NextResponse.json({ success: true });
  }

  // 결제 실패/취소
  if (data.status === 'CANCELED' || data.status === 'ABORTED') {
    await db.update(payments)
      .set({
        status: data.status === 'CANCELED' ? 'cancelled' : 'failed',
        paymentKey: data.paymentKey,
        webhookReceivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ message: '처리할 이벤트 없음' }, { status: 200 });
}
