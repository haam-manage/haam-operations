import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { Check, Lock, Package, Calendar, AlertCircle } from 'lucide-react';
import { db } from '../../../../../db';
import { payments, contracts, cabinets, qrQueue } from '../../../../../db/schema';
import { confirmPayment, TossPaymentError } from '../../../../../lib/toss';
import { sendPaymentCompleteAlimtalk } from '../../../../../lib/alimtalk';
import { notifyEvent } from '../../../../../lib/telegram';
import { StepLayout } from '../../../../components/StepLayout';

interface PageProps {
  searchParams: Promise<{
    paymentKey?: string;
    orderId?: string;
    amount?: string;
    paymentType?: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function BookingSuccessPage({ searchParams }: PageProps) {
  const { paymentKey, orderId, amount } = await searchParams;

  if (!paymentKey || !orderId || !amount) {
    return <FailBanner title="잘못된 접근" message="결제 파라미터가 누락되었습니다." />;
  }

  const payment = await db.query.payments.findFirst({
    where: eq(payments.orderId, orderId),
  });

  if (!payment) {
    return <FailBanner title="주문을 찾을 수 없습니다" message={`주문번호: ${orderId}`} />;
  }

  const amountNum = Number(amount);
  if (Number.isNaN(amountNum) || payment.amount !== amountNum) {
    return <FailBanner title="금액 불일치" message="결제 금액이 주문과 일치하지 않습니다. 고객센터로 문의해 주세요." />;
  }

  // 이미 처리된 결제면 완료 UI 만 렌더
  if (payment.status !== 'completed') {
    try {
      await confirmPayment(paymentKey, orderId, amountNum);
    } catch (err) {
      const code = err instanceof TossPaymentError ? err.code : 'UNKNOWN';
      const message = err instanceof Error ? err.message : '결제 승인 실패';
      return <FailBanner title="결제 승인 실패" message={`${message} (${code})`} />;
    }

    await db.update(payments).set({
      status: 'completed',
      paymentKey,
      webhookReceivedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(payments.id, payment.id));

    const contract = await db.query.contracts.findFirst({
      where: eq(contracts.id, payment.contractId),
      with: { customer: true, cabinet: true },
    });

    if (contract) {
      await db.update(contracts).set({ status: 'active', updatedAt: new Date() })
        .where(eq(contracts.id, contract.id));

      await db.update(cabinets).set({ isAvailable: false })
        .where(eq(cabinets.id, contract.cabinetId));

      const existingQr = await db.query.qrQueue.findFirst({
        where: eq(qrQueue.contractId, contract.id),
      });
      if (!existingQr && contract.cabinet && contract.customer) {
        await db.insert(qrQueue).values({
          contractId: contract.id,
          cabinetNumber: contract.cabinet.number,
          securityCode: contract.securityCode,
          userName: contract.customer.name,
          userType: 'primary',
          status: 'pending',
        });
      }

      if (contract.cabinet && contract.customer) {
        await sendPaymentCompleteAlimtalk({
          phone: contract.customer.phone,
          customerName: contract.customer.name,
          cabinetNumber: contract.cabinet.number,
          securityCode: contract.securityCode,
          startDate: contract.startDate,
          expiryDate: contract.expiryDate,
          contractId: contract.id,
        }).catch((e) => console.error('[success] alimtalk 실패', e));

        await notifyEvent('payment_complete', {
          고객: contract.customer.name,
          보관함: contract.cabinet.number,
          금액: `₩${amountNum.toLocaleString()}`,
        }).catch((e) => console.error('[success] telegram 실패', e));
      }
    }
  }

  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.id, payment.contractId),
    with: { cabinet: true },
  });

  if (!contract || !contract.cabinet) {
    return <FailBanner title="계약 조회 실패" message="관리자에게 문의해 주세요." />;
  }

  return (
    <StepLayout step={6} totalSteps={6} title="" showLogout={false}>
      <div className="text-center py-8 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/15 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">예약 완료!</h2>
        <p className="text-stone-400 text-sm mb-6">{contract.cabinet.number} 보관함이 예약되었습니다.</p>

        <div className="glass p-5 mb-6 space-y-3 text-left max-w-sm mx-auto">
          <div className="flex items-center gap-3 text-sm">
            <Package className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-stone-400">보관함</span>
            <span className="text-white ml-auto font-mono font-semibold">{contract.cabinet.number}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-stone-400">기간</span>
            <span className="text-white ml-auto tabular-nums text-xs">{contract.startDate} ~ {contract.expiryDate}</span>
          </div>
          <div className="divider" />
          <div className="flex items-center gap-3 text-sm">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-stone-400">보안코드</span>
            <span className="text-white ml-auto font-mono text-lg tracking-widest tabular-nums">{contract.securityCode}</span>
          </div>
        </div>

        <p className="text-xs text-stone-500 mb-6">카카오톡으로 보안코드와 이용 안내가 발송됩니다.</p>

        <Link
          href={`/my/${contract.myPageToken}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-medium transition-colors"
        >
          내 예약 보기
        </Link>
      </div>
    </StepLayout>
  );
}

function FailBanner({ title, message }: { title: string; message: string }) {
  return (
    <StepLayout step={0} totalSteps={6} title="" showLogout={false}>
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/15 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-stone-400 text-sm mb-8 max-w-sm mx-auto">{message}</p>
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-medium transition-colors"
        >
          처음부터 다시
        </Link>
      </div>
    </StepLayout>
  );
}
