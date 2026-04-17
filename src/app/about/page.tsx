import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, MapPin, QrCode, Shield, Clock, ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="flex-1">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0c0a09]/90 backdrop-blur-lg border-b border-white/5 safe-top">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="touch-target w-10 h-10 -ml-2 flex items-center text-stone-400">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Image src="/images/HAAM_LOGO(S)_001.jpg" alt="HAAM" width={24} height={24} className="rounded-md" />
          <div className="w-10" />
        </div>
      </header>

      {/* ─── Hero Image ─── */}
      <section className="relative h-[50vh] min-h-[360px]">
        <Image src="/images/2.png" alt="HAAM 셀프스토리지" fill className="object-cover" sizes="(max-width: 768px) 100vw, 512px" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0a09]/20 via-[#0c0a09]/40 to-[#0c0a09]" />
        <div className="absolute bottom-0 left-0 right-0 p-6 max-w-lg mx-auto">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">도심창고:함</h1>
          <p className="text-sm text-stone-400">숭실대입구역 7번 출구 도보 3분 · 24시간 자유 출입</p>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="px-6 py-12 max-w-lg mx-auto">
        <div className="mb-8">
          <p className="text-xs text-amber-700 uppercase tracking-widest mb-1.5">How It Works</p>
          <h2 className="text-xl font-bold text-white">간편한 3단계</h2>
        </div>

        <div className="relative pl-10">
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-amber-700/40 via-amber-700/20 to-transparent" />
          <TimelineStep icon={<QrCode className="w-4 h-4" />} number={1} title="보관함 선택 & 결제" desc="원하는 크기를 고르고 카드로 간편 결제" />
          <TimelineStep icon={<Shield className="w-4 h-4" />} number={2} title="보안코드 발급" desc="결제 즉시 카카오톡으로 5자리 코드 안내" />
          <TimelineStep icon={<Clock className="w-4 h-4" />} number={3} title="24시간 자유 이용" desc="QR코드로 출입, 보안코드로 보관함 오픈" last />
        </div>
      </section>

      {/* ─── 가격표 ─── */}
      <section id="plans" className="px-6 py-12 max-w-lg mx-auto scroll-mt-4">
        <div className="mb-8">
          <p className="text-xs text-amber-700 uppercase tracking-widest mb-1.5">Storage Plans</p>
          <h2 className="text-xl font-bold text-white">어떤 크기가 필요하세요?</h2>
        </div>

        <div className="space-y-3">
          <PriceCard name="소중:함" size="M" image="/images/3.png" price={70000} deposit={70000} desc="겨울 옷, 캠핑 장비, 스포츠 용품" maxUsers={2} popular={false} />
          <PriceCard name="든든:함" size="L" image="/images/6.png" price={120000} deposit={120000} desc="사계절 의류, 골프백, 여행 가방" maxUsers={3} popular />
          <PriceCard name="넉넉:함" size="XL" image="/images/5.png" price={200000} deposit={200000} desc="대형 스포츠 장비, 이불, 가전제품" maxUsers={4} popular={false} />
        </div>

        <div className="mt-6 glass-warm p-4 text-center">
          <p className="text-sm text-stone-400">
            장기 할인: 3개월 <span className="text-amber-600 font-medium">10%</span> · 6개월 <span className="text-amber-600 font-medium">15%</span> · 12개월 <span className="text-amber-600 font-medium">20%</span>
          </p>
          <p className="text-xs text-stone-600 mt-1">보증금 1회 수납, 종료 후 3일 내 반환</p>
        </div>
      </section>

      {/* ─── 위치 ─── */}
      <section className="px-6 py-12 max-w-lg mx-auto">
        <div className="glass p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-900/20 border border-amber-800/20 flex items-center justify-center text-amber-600 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm mb-1">오시는 길</h3>
            <p className="text-sm text-stone-400 leading-relaxed">서울 동작구 상도로 61길<br />숭실대입구역 7번 출구 도보 3분</p>
          </div>
        </div>
      </section>

      {/* ─── Sticky Bottom CTA ─── */}
      <div className="sticky-bottom">
        <div className="max-w-lg mx-auto">
          <Link href="/auth?redirect=/booking" className="btn-primary w-full py-3.5 text-base gap-2">
            시작하기
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <footer className="border-t border-white/5 py-10 px-6 pb-24">
        <div className="max-w-lg mx-auto text-center">
          <Image src="/images/HAAM_LOGO(S)_001.jpg" alt="HAAM" width={32} height={32} className="rounded-lg mx-auto mb-3" />
          <div className="flex justify-center gap-6 text-xs">
            <Link href="/terms" className="text-stone-600 hover:text-stone-400 py-2 px-1">이용약관</Link>
            <Link href="/privacy" className="text-stone-600 hover:text-stone-400 py-2 px-1">개인정보처리방침</Link>
          </div>
          <p className="mt-3 text-stone-700 text-xs">&copy; 2026 HAAM. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

function PriceCard({ name, size, image, price, deposit, desc, maxUsers, popular }: {
  name: string; size: string; image: string; price: number; deposit: number; desc: string; maxUsers: number; popular: boolean;
}) {
  return (
    <Link href={`/auth?redirect=/booking?size=${size}`} className={`block ${popular ? 'glass-warm glow-warm' : 'glass'} glass-hover overflow-hidden active:scale-[0.98] transition-transform`}>
      <div className="flex gap-4 p-4">
        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative">
          <Image src={image} alt={name} fill className="object-cover" sizes="80px" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-stone-500 uppercase tracking-wider">{size}</span>
            {popular && <span className="badge badge-warm text-[10px] py-0.5 px-2">인기</span>}
          </div>
          <h3 className="font-bold text-white text-base mb-0.5">{name}</h3>
          <p className="text-[11px] text-stone-600 mb-1.5">{desc}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-white">월 ₩{price.toLocaleString()}</span>
          </div>
          <p className="text-[11px] text-stone-600">보증금 ₩{deposit.toLocaleString()} · 최대 {maxUsers}명</p>
        </div>
        <div className="flex items-center text-stone-700"><ChevronRight className="w-5 h-5" /></div>
      </div>
    </Link>
  );
}

function TimelineStep({ icon, number, title, desc, last }: { icon: React.ReactNode; number: number; title: string; desc: string; last?: boolean }) {
  return (
    <div className={`relative flex gap-4 ${last ? '' : 'pb-6'}`}>
      <div className="absolute -left-10 top-0.5 w-9 h-9 rounded-xl bg-amber-900/15 border border-amber-800/15 flex items-center justify-center text-amber-600">{icon}</div>
      <div>
        <p className="text-[10px] text-stone-600 uppercase tracking-wider">Step {number}</p>
        <h3 className="font-semibold text-white text-sm mb-0.5">{title}</h3>
        <p className="text-xs text-stone-500">{desc}</p>
      </div>
    </div>
  );
}
