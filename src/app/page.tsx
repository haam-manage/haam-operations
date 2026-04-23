'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, Info, Ticket } from 'lucide-react';

const SLIDES = [
  { src: '/images/1.png', caption: '숭실대입구역 도보 3분', subcaption: '출퇴근 길에 자연스럽게' },
  { src: '/images/2.png', caption: '합리적인 가격', subcaption: '월 7만원부터 시작' },
  { src: '/images/6.png', caption: '24시간 자유 이용', subcaption: 'QR 출입 · 보안코드' },
];

export default function SplashPage() {
  const [index, setIndex] = useState(0);
  const [banner, setBanner] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/banner/active')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.banner) setBanner(data.banner as { id: string; label: string });
      })
      .catch(() => {});
  }, []);

  return (
    <main className="relative h-screen min-h-[600px] flex flex-col overflow-hidden">
      {/* ─── Background Slideshow ─── */}
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.2, ease: 'easeInOut' }, scale: { duration: 6, ease: 'easeOut' } }}
            className="absolute inset-0"
          >
            <Image
              src={SLIDES[index].src}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority={index === 0}
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0a09]/40 via-[#0c0a09]/30 to-[#0c0a09]/95" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a09] via-transparent to-transparent" />
      </div>

      {/* ─── Center: Tagline with slide sync ─── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm text-amber-500/80 uppercase tracking-[0.3em] mb-3">
              {SLIDES[index].subcaption}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              {SLIDES[index].caption}
            </h1>
          </motion.div>
        </AnimatePresence>

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-8 text-center"
        >
          <p className="text-stone-400 text-sm">도심창고:함</p>
          <p className="text-stone-600 text-xs tracking-widest mt-1">HAAM SELF STORAGE</p>
        </motion.div>

        {/* Slide dots */}
        <div className="flex gap-2 mt-8">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === index ? 'w-8 bg-amber-500' : 'w-1 bg-white/20'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ─── Bottom: CTA ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="relative z-10 p-6 pb-10 safe-bottom"
      >
        <div className="max-w-md mx-auto space-y-3">
          {banner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex items-center justify-center"
            >
              <div className="inline-flex items-center gap-2 py-1.5 px-3 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-950/70 via-amber-900/50 to-amber-950/70 backdrop-blur-md shadow-lg shadow-amber-500/10">
                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold tracking-[0.15em] text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  LIVE
                </span>
                <span className="text-[11px] font-medium text-white/95 max-w-[70vw] truncate">
                  {banner.label}
                </span>
              </div>
            </motion.div>
          )}

          <Link
            href="/auth?redirect=/booking"
            className="btn-primary w-full py-4 text-base gap-2 glow-warm-strong"
          >
            시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>

          <div className="flex gap-3">
            <Link
              href="/about"
              className="flex-1 btn-ghost py-3 text-sm gap-1.5"
            >
              <Info className="w-4 h-4" />
              자세히 보기
            </Link>
            <a
              href="https://map.naver.com/p/search/도심창고 함"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 btn-ghost py-3 text-sm gap-1.5"
            >
              <MapPin className="w-4 h-4" />
              오시는 길
            </a>
          </div>

          <Link
            href="/my"
            className="group flex items-center gap-3 py-3 px-4 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md hover:border-amber-500/40 hover:bg-amber-950/20 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 group-hover:bg-amber-500/25 transition-colors">
              <Ticket className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 text-left leading-tight">
              <div className="text-[10px] text-stone-500 uppercase tracking-[0.15em]">Membership</div>
              <div className="text-sm font-semibold text-white">내 예약 조회</div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
