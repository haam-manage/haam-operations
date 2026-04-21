import Link from 'next/link';
import { eq, and } from 'drizzle-orm';
import { AlertCircle } from 'lucide-react';
import { db } from '../../../../../db';
import { payments } from '../../../../../db/schema';
import { StepLayout } from '../../../../components/StepLayout';

interface PageProps {
  searchParams: Promise<{
    code?: string;
    message?: string;
    orderId?: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function BookingFailPage({ searchParams }: PageProps) {
  const { code, message, orderId } = await searchParams;

  if (orderId) {
    try {
      await db.update(payments)
        .set({
          status: 'failed',
          failReason: `${code || 'UNKNOWN'}: ${message || '결제 실패'}`,
          updatedAt: new Date(),
        })
        .where(and(eq(payments.orderId, orderId), eq(payments.status, 'pending')));
    } catch (err) {
      console.error('[booking/fail] payment 업데이트 실패', err);
    }
  }

  return (
    <StepLayout step={0} totalSteps={6} title="" showLogout={false}>
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/15 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">결제가 완료되지 않았습니다</h2>
        <p className="text-stone-400 text-sm mb-2 max-w-sm mx-auto">{message || '결제가 처리되지 않았습니다.'}</p>
        {code && <p className="text-[11px] text-stone-600 font-mono mb-8">CODE: {code}</p>}

        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-medium transition-colors"
          >
            다시 시도
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 font-medium transition-colors"
          >
            홈으로
          </Link>
        </div>
      </div>
    </StepLayout>
  );
}
