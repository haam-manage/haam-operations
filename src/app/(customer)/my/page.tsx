import { requireAuth } from '../../../../lib/auth';
import { db } from '../../../../db';
import { contracts } from '../../../../db/schema';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Box, ChevronRight, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MyListPage() {
  const customer = await requireAuth();

  const list = await db.query.contracts.findMany({
    where: and(
      eq(contracts.customerId, customer.id),
      inArray(contracts.status, ['reserved', 'active', 'expired']),
    ),
    orderBy: [desc(contracts.createdAt)],
    with: { cabinet: true },
  });

  if (list.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/5 flex items-center justify-center mx-auto mb-5">
            <Box className="w-6 h-6 text-stone-500" />
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">등록된 계약이 없습니다</h1>
          <p className="text-sm text-stone-500 mb-6">
            {customer.name}님 명의로 진행 중인 보관함 계약이 없어요.
          </p>
          <Link href="/booking" className="btn-primary py-3 px-6 text-sm gap-2 inline-flex">
            <Plus className="w-4 h-4" />
            보관함 예약하기
          </Link>
        </div>
      </main>
    );
  }

  if (list.length === 1) {
    redirect(`/my/${list[0].myPageToken}`);
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 bg-[#0c0a09]/90 backdrop-blur-lg border-b border-white/5 safe-top">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center gap-2.5">
          <Image src="/images/HAAM_LOGO(S)_001.jpg" alt="HAAM" width={24} height={24} className="rounded-md" />
          <span className="text-sm font-medium text-white">내 예약</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-6">
        <p className="text-xs text-stone-500 mb-3">
          {customer.name}님 · 계약 {list.length}건
        </p>
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                href={`/my/${c.myPageToken}`}
                className="glass glass-hover flex items-center justify-between p-4 touch-target"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">
                    {c.cabinet?.number}
                    <span className="text-stone-500 font-normal ml-1">({c.cabinet?.size})</span>
                  </div>
                  <div className="text-[11px] text-stone-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{c.startDate} ~ {c.expiryDate}</span>
                    <span>·</span>
                    <StatusLabel status={c.status} />
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-600 shrink-0 ml-2" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function StatusLabel({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: '이용 중', className: 'text-green-400' },
    reserved: { label: '결제 대기', className: 'text-yellow-400' },
    expired: { label: '만료', className: 'text-red-400' },
  };
  const s = map[status] ?? { label: status, className: 'text-stone-500' };
  return <span className={s.className}>{s.label}</span>;
}
