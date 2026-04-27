import { db } from '../../../../db';
import { contracts, customers, cabinets } from '../../../../db/schema';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Search, Download, Users, CheckCircle, Clock, AlertTriangle, Archive, Layers } from 'lucide-react';
import { CancelButton } from './CancelButton';
import { EditButton } from './EditButton';

export const dynamic = 'force-dynamic';

type StatusKey = 'all' | 'reserved' | 'active' | 'expired' | 'archived';

const STATUS_TABS: { key: StatusKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: '전체', icon: <Layers className="w-3.5 h-3.5" /> },
  { key: 'reserved', label: '결제대기', icon: <Clock className="w-3.5 h-3.5" /> },
  { key: 'active', label: '활성', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  { key: 'expired', label: '만료', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { key: 'archived', label: '아카이빙', icon: <Archive className="w-3.5 h-3.5" /> },
];

const STATUS_BADGE: Record<string, string> = {
  reserved: 'badge-yellow',
  active: 'badge-green',
  expired: 'badge-red',
  archived: 'badge-blue',
};

const STATUS_LABEL: Record<string, string> = {
  reserved: '결제대기',
  active: '활성',
  expired: '만료',
  archived: '아카이빙',
};

function parseStatus(raw: string | undefined): StatusKey {
  if (raw === 'reserved' || raw === 'active' || raw === 'expired' || raw === 'archived') return raw;
  return 'all';
}

type PageProps = {
  searchParams: Promise<{ status?: string; q?: string }>;
};

export default async function ContractsPage({ searchParams }: PageProps) {
  const { status: rawStatus, q: rawQ } = await searchParams;
  const status = parseStatus(rawStatus);
  const q = (rawQ ?? '').trim();

  const whereClause = and(
    status === 'all' ? undefined : eq(contracts.status, status),
    q
      ? or(
          ilike(customers.name, `%${q}%`),
          ilike(customers.phone, `%${q}%`),
          ilike(cabinets.number, `%${q}%`),
        )
      : undefined,
  );

  const [rows, counts] = await Promise.all([
    db
      .select({
        id: contracts.id,
        status: contracts.status,
        startDate: contracts.startDate,
        expiryDate: contracts.expiryDate,
        months: contracts.months,
        rentalAmount: contracts.rentalAmount,
        depositAmount: contracts.depositAmount,
        renewal: contracts.renewal,
        remark: contracts.remark,
        createdAt: contracts.createdAt,
        customerName: customers.name,
        customerPhone: customers.phone,
        cabinetNumber: cabinets.number,
        cabinetSize: cabinets.size,
      })
      .from(contracts)
      .innerJoin(customers, eq(contracts.customerId, customers.id))
      .innerJoin(cabinets, eq(contracts.cabinetId, cabinets.id))
      .where(whereClause)
      .orderBy(desc(contracts.createdAt))
      .limit(200),
    db
      .select({
        status: contracts.status,
        c: sql<number>`count(*)::int`,
      })
      .from(contracts)
      .groupBy(contracts.status),
  ]);

  const countByStatus = counts.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = r.c;
    return acc;
  }, {});
  const total = counts.reduce((sum, r) => sum + r.c, 0);

  const csvHref = `/api/admin/contracts/csv?${new URLSearchParams({
    ...(status !== 'all' ? { status } : {}),
    ...(q ? { q } : {}),
  }).toString()}`;

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 bg-[#0c0a09]/90 backdrop-blur-lg border-b border-white/5 safe-top">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/dashboard" className="touch-target w-10 h-10 flex items-center justify-center text-stone-500 hover:text-stone-300">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Image src="/images/HAAM_LOGO(S)_001.jpg" alt="HAAM" width={24} height={24} className="rounded-md" />
            <span className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-600" />
              계약 관리
            </span>
          </div>
          <a
            href={csvHref}
            className="touch-target flex items-center gap-1.5 text-xs text-stone-400 hover:text-amber-500 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-6">
        {/* Search */}
        <form method="get" className="mb-4">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="고객명·전화번호·보관함번호"
              className="w-full glass pl-10 pr-4 py-3 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-600/40"
            />
          </div>
        </form>

        {/* Status tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const c = tab.key === 'all' ? total : (countByStatus[tab.key] ?? 0);
            const active = status === tab.key;
            const params = new URLSearchParams({
              ...(tab.key !== 'all' ? { status: tab.key } : {}),
              ...(q ? { q } : {}),
            });
            const href = params.toString() ? `/contracts?${params.toString()}` : '/contracts';
            return (
              <Link
                key={tab.key}
                href={href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                  active
                    ? 'bg-amber-600/15 border-amber-600/30 text-amber-400'
                    : 'bg-white/3 border-white/5 text-stone-400 hover:text-stone-200 hover:bg-white/5'
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className={`ml-0.5 ${active ? 'text-amber-300' : 'text-stone-600'}`}>{c}</span>
              </Link>
            );
          })}
        </div>

        {/* List */}
        <section className="glass overflow-hidden">
          {rows.length === 0 ? (
            <p className="text-stone-600 text-sm text-center py-12">조건에 맞는 계약이 없습니다</p>
          ) : (
            <div className="divide-y divide-white/4">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-11 h-11 rounded-lg bg-white/4 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[9px] text-stone-600 uppercase">{r.cabinetSize}</span>
                    <span className="text-[10px] text-stone-300 font-mono font-medium">{r.cabinetNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{r.customerName}</span>
                      <span className={`badge text-[9px] ${STATUS_BADGE[r.status] ?? 'badge-warm'}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-600 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-mono">{r.customerPhone}</span>
                      <span>·</span>
                      <span>{r.months}개월</span>
                      <span>·</span>
                      <span>{r.startDate} ~ {r.expiryDate}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm text-white font-medium">₩{r.rentalAmount.toLocaleString()}</div>
                    <div className="text-[10px] text-stone-600">보증금 ₩{r.depositAmount.toLocaleString()}</div>
                    <div className="mt-1 inline-flex items-center gap-1">
                      {(r.status === 'active' || r.status === 'expired' || r.status === 'reserved') && (
                        <EditButton
                          row={{
                            id: r.id,
                            customerName: r.customerName,
                            cabinetNumber: r.cabinetNumber,
                            startDate: r.startDate,
                            expiryDate: r.expiryDate,
                            months: r.months,
                            rentalAmount: r.rentalAmount,
                            remark: r.remark,
                          }}
                        />
                      )}
                      {r.status === 'reserved' && (
                        <CancelButton
                          contractId={r.id}
                          label={`${r.customerName} · ${r.cabinetNumber} · ${r.months}개월`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {rows.length >= 200 && (
          <p className="text-[11px] text-stone-600 text-center mt-3">최근 200건만 표시 — 필터·검색으로 좁히거나 CSV로 받아가세요</p>
        )}
      </div>
    </main>
  );
}
