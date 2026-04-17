import { db } from '../../../../../db';
import { contracts } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, Box, Calendar, Users, RefreshCw, AlertTriangle, Shield, ChevronDown } from 'lucide-react';
import { CopyCodeCard } from './CopyCodeCard';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function MyPage({ params }: PageProps) {
  const { token } = await params;

  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.myPageToken, token),
    with: {
      customer: true,
      cabinet: true,
      coUsers: true,
    },
  });

  if (!contract || contract.status === 'archived') {
    notFound();
  }

  const isActive = contract.status === 'active';
  const isExpired = contract.status === 'expired';

  // D-day calculation
  const daysLeft = isActive
    ? Math.ceil((new Date(contract.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0c0a09]/90 backdrop-blur-lg border-b border-white/5 safe-top">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/images/HAAM_LOGO(S)_001.jpg" alt="HAAM" width={24} height={24} className="rounded-md" />
            <span className="text-sm font-medium text-white">마이페이지</span>
          </div>
          <div className="flex items-center gap-2">
            {daysLeft !== null && daysLeft <= 30 && (
              <span className={`badge text-[10px] ${daysLeft <= 7 ? 'badge-red' : 'badge-yellow'}`}>
                D-{daysLeft}
              </span>
            )}
            <span className={`badge text-[10px] ${
              isActive ? 'badge-green' : isExpired ? 'badge-yellow' : 'badge-blue'
            }`}>
              {isActive ? '이용 중' : isExpired ? '만료' : contract.status === 'reserved' ? '결제 대기' : contract.status}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-6">
        {/* Security Code — Tap to copy */}
        <CopyCodeCard code={contract.securityCode} />

        {/* Contract Info */}
        <section className="glass p-5 mb-4">
          <h2 className="text-xs text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5" />
            계약 정보
          </h2>
          <dl className="space-y-3">
            <InfoRow label="고객명" value={contract.customer!.name} />
            <InfoRow label="보관함" value={`${contract.cabinet!.number} (${contract.cabinet!.size})`} />
            <InfoRow label="기간" value={`${contract.startDate} ~ ${contract.expiryDate}`} />
            <InfoRow label="개월" value={`${contract.months}개월`} />
          </dl>
        </section>

        {/* Co-users */}
        <section className="glass p-5 mb-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              공동사용자
            </h2>
            <span className="text-[10px] text-stone-600">
              {(contract.coUsers?.length || 0) + 1} / {getMaxUsers(contract.cabinet!.size)}명
            </span>
          </div>

          {contract.coUsers && contract.coUsers.length > 0 ? (
            <ul className="space-y-2">
              {contract.coUsers.map(cu => (
                <li key={cu.id} className="flex justify-between items-center bg-white/3 border border-white/4 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-white/4 flex items-center justify-center text-stone-500">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm text-white">{cu.name}</span>
                  </div>
                  <span className="font-mono text-xs text-stone-500">{cu.securityCode}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-stone-600 text-sm text-center py-4">등록된 공동사용자가 없습니다</p>
          )}

          {isActive && (contract.coUsers?.length || 0) + 1 < getMaxUsers(contract.cabinet!.size) && (
            <button className="mt-4 w-full btn-ghost py-3 text-sm gap-1.5 touch-target">
              <Users className="w-4 h-4" />
              공동사용자 초대하기
            </button>
          )}
        </section>

        {/* Actions */}
        {isActive && (
          <Link href={`/renew/${token}`} className="btn-primary w-full py-4 text-base gap-2 touch-target">
            <RefreshCw className="w-5 h-5" />
            재계약하기
          </Link>
        )}

        {isExpired && (
          <div className="glass p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-300 font-medium mb-0.5">계약이 만료되었습니다</p>
              <p className="text-xs text-stone-500">보증금 반환 계좌 등록 링크가 카카오톡으로 발송되었습니다.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-stone-500">{label}</span>
      <span className="text-sm text-stone-200 font-medium">{value}</span>
    </div>
  );
}

function getMaxUsers(size: string): number {
  const map: Record<string, number> = { M: 2, L: 3, XL: 4 };
  return map[size] || 2;
}
