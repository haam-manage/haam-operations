import { db } from '../../../../db';
import { contracts, payments, cabinets, alimtalkLogs } from '../../../../db/schema';
import { eq, count } from 'drizzle-orm';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, CreditCard, MessageSquare, Users, Gift, Play, Activity, ChevronRight, Box, AlertTriangle, Clock, CheckCircle, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [
    activeCount,
    reservedCount,
    expiredCount,
    availableCabinetsCount,
    recentPayments,
    recentAlimtalk,
  ] = await Promise.all([
    db.select({ count: count() }).from(contracts).where(eq(contracts.status, 'active')),
    db.select({ count: count() }).from(contracts).where(eq(contracts.status, 'reserved')),
    db.select({ count: count() }).from(contracts).where(eq(contracts.status, 'expired')),
    db.select({ count: count() }).from(cabinets).where(eq(cabinets.isAvailable, true)),
    db.query.payments.findMany({
      where: eq(payments.status, 'completed'),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
      limit: 10,
      with: { contract: { with: { customer: true, cabinet: true } } },
    }),
    db.query.alimtalkLogs.findMany({
      orderBy: (a, { desc }) => [desc(a.sentAt)],
      limit: 10,
    }),
  ]);

  const stats = {
    active: activeCount[0]?.count || 0,
    reserved: reservedCount[0]?.count || 0,
    expired: expiredCount[0]?.count || 0,
    availableCabinets: availableCabinetsCount[0]?.count || 0,
  };

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 bg-[#0c0a09]/90 backdrop-blur-lg border-b border-white/5 safe-top">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/images/HAAM_LOGO(S)_001.jpg" alt="HAAM" width={24} height={24} className="rounded-md" />
            <span className="text-sm font-semibold text-white">관리자</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="touch-target w-10 h-10 flex items-center justify-center text-stone-500 hover:text-stone-300">
              <RefreshCw className="w-4 h-4" />
            </Link>
            <Link href="/" className="text-xs text-stone-500 hover:text-stone-300 transition-colors py-2 px-1">홈</Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6">
        {/* Stats — highlight available cabinets */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard icon={<Box className="w-4 h-4" />} label="빈 보관함" value={`${stats.availableCabinets}/61`} color="amber" highlight />
          <StatCard icon={<CheckCircle className="w-4 h-4" />} label="활성 계약" value={stats.active} color="green" />
          <StatCard icon={<Clock className="w-4 h-4" />} label="결제 대기" value={stats.reserved} color="yellow" />
          <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="만료" value={stats.expired} color="red" />
        </div>

        {/* Recent Payments */}
        <section className="glass p-5 mb-4">
          <h2 className="text-xs text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-amber-600" />
            최근 결제
          </h2>
          {recentPayments.length === 0 ? (
            <p className="text-stone-600 text-sm text-center py-6">결제 내역이 없습니다</p>
          ) : (
            <div className="space-y-0.5">
              {recentPayments.map(p => (
                <div key={p.id} className="flex justify-between items-center py-3 border-b border-white/4 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/4 flex items-center justify-center text-[10px] text-stone-500 font-mono">
                      {p.contract?.cabinet?.number?.slice(0, 3)}
                    </div>
                    <div>
                      <span className="text-sm text-stone-200 font-medium">{p.contract?.customer?.name}</span>
                      <span className="text-xs text-stone-600 ml-1.5">{p.contract?.cabinet?.number}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-white font-medium">₩{p.amount.toLocaleString()}</span>
                    <span className="block text-[10px] text-stone-600">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Alimtalk */}
        <section className="glass p-5 mb-6">
          <h2 className="text-xs text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
            최근 알림톡
          </h2>
          {recentAlimtalk.length === 0 ? (
            <p className="text-stone-600 text-sm text-center py-6">발송 내역이 없습니다</p>
          ) : (
            <div className="space-y-0.5">
              {recentAlimtalk.map(a => (
                <div key={a.id} className="flex justify-between items-center py-3 border-b border-white/4 last:border-0">
                  <div>
                    <span className="text-sm text-stone-200">{a.templateName}</span>
                    <span className="text-xs text-stone-600 ml-1.5">{a.recipientPhone}</span>
                  </div>
                  <span className={`badge text-[10px] ${a.success ? 'badge-green' : 'badge-red'}`}>
                    {a.success ? '성공' : '실패'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Nav */}
        <div className="grid grid-cols-2 gap-3">
          <NavCard href="/admin/contracts" icon={<Users className="w-5 h-5" />} label="계약 관리" />
          <NavCard href="/admin/promotions" icon={<Gift className="w-5 h-5" />} label="프로모션" />
          <NavCard href="/api/cron/daily" icon={<Play className="w-5 h-5" />} label="배치 실행" />
          <NavCard href="/api/health" icon={<Activity className="w-5 h-5" />} label="시스템 상태" />
        </div>
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, color, highlight }: { icon: React.ReactNode; label: string; value: number | string; color: string; highlight?: boolean }) {
  const colorMap: Record<string, string> = {
    amber: 'text-amber-500 bg-amber-900/15 border-amber-800/15',
    green: 'text-green-400 bg-green-500/10 border-green-500/15',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/15',
    red: 'text-red-400 bg-red-500/10 border-red-500/15',
  };

  return (
    <div className={`${highlight ? 'glass-warm glow-warm' : 'glass'} p-4`}>
      <div className={`w-8 h-8 rounded-lg ${colorMap[color]} border flex items-center justify-center mb-2.5`}>
        {icon}
      </div>
      <div className="text-[10px] text-stone-500 uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold text-white mt-0.5">{value}</div>
    </div>
  );
}

function NavCard({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="glass glass-hover p-4 flex items-center justify-between group touch-target">
      <div className="flex items-center gap-3">
        <span className="text-stone-500 group-hover:text-amber-600 transition-colors">{icon}</span>
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-stone-700 group-hover:text-stone-400 transition-colors" />
    </Link>
  );
}
