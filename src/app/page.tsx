'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, Info, Ticket, Gift } from 'lucide-react';

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
              transition={{ delay: 0.3, duration: 0.7 }}
              className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/45 via-stone-900/55 to-orange-950/45 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(251,146,60,0.35)]"
            >
              {/* Ambient glows */}
              <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full bg-amber-500/30 blur-3xl animate-pulse" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-orange-500/20 blur-3xl" />
              {/* Top accent line */}
              <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

              <div className="relative flex items-center gap-3 p-3.5">
                {/* Icon */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 via-orange-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/40">
                    <Gift className="w-6 h-6 text-black/85" strokeWidth={2.5} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 ring-2 ring-[#0c0a09] animate-pulse" />
                </div>

                {/* Copy */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/90 text-white text-[8px] font-extrabold tracking-[0.15em]">
                      <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.15em] text-amber-400/90 font-semibold">
                      오늘의 특가
                    </span>
                  </div>
                  <div className="text-[15px] font-bold text-white leading-tight truncate">
                    {banner.label}
                  </div>
                  <div className="text-[10px] text-amber-300/90 mt-0.5 flex items-center gap-1">
                    지금 시작하면 즉시 적용
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
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

          <Link
            href="/my"
            className="group w-full flex items-center justify-center gap-2 py-4 px-8 text-base font-medium rounded-[0.875rem] border border-amber-500/30 bg-amber-950/20 backdrop-blur-md text-amber-200 hover:bg-amber-950/40 hover:border-amber-500/50 hover:text-amber-100 transition-all"
          >
            <Ticket className="w-5 h-5" />
            내 예약 조회
            <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
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
        </div>
      </motion.div>
    </main>
  );
}
