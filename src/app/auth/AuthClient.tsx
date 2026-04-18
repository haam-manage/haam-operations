'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPhone } from '../../components/Input';
import { ConsentCheckboxes, type ConsentState } from '../../components/ConsentCheckboxes';

type Stage = 'intro' | 'otp' | 'terms' | 'done';

interface Props {
  redirectTo: string;
}

export default function AuthClient({ redirectTo }: Props) {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('intro');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [existingName, setExistingName] = useState<string | null>(null);
  const [otpChannel, setOtpChannel] = useState<'alimtalk' | 'sms'>('alimtalk');
  const [consent, setConsent] = useState<ConsentState>({
    age14: false,
    terms: false,
    privacy: false,
    marketing: false,
  });

  const consentValid = consent.age14 && consent.terms && consent.privacy;
  const nameValid = name.trim().length >= 2;
  const phoneValid = phone.replace(/\D/g, '').length >= 10;

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (stage === 'otp') setTimeout(() => otpInputRef.current?.focus(), 400);
  }, [stage]);

  useEffect(() => {
    if (stage === 'intro' && nameValid && !phone) {
      setTimeout(() => phoneInputRef.current?.focus(), 450);
    }
  }, [stage, nameValid, phone]);

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!nameValid) {
      toast.error('이름을 먼저 입력해 주세요');
      return;
    }
    if (!cleanPhone.match(/^01[016789]\d{7,8}$/)) {
      toast.error('올바른 전화번호를 입력해 주세요');
      return;
    }

    setLoading(true);
    try {
      const checkRes = await fetch('/api/auth/check-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const checkData = await checkRes.json();
      setIsReturningUser(checkData.exists);
      setExistingName(checkData.name);

      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      setCountdown(data.expiresIn || 180);
      setOtpChannel(data.channel || 'alimtalk');
      setStage('otp');
      toast.success(
        data.channel === 'sms'
          ? '문자로 인증번호를 발송했어요'
          : '카카오톡으로 인증번호를 발송했어요'
      );
    } catch {
      toast.error('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ''),
          code: otp,
          name: isReturningUser ? undefined : name.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        setOtp('');
        return;
      }

      if (data.isNewUser) {
        setStage('terms');
      } else {
        setStage('done');
        toast.success(`${data.customerName}님, 다시 만나서 반가워요!`);
        setTimeout(() => router.push(redirectTo), 1200);
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!consentValid) {
      toast.error('필수 약관에 동의해 주세요');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      setStage('done');
      toast.success(`${data.customerName}님, 환영합니다!`);
      setTimeout(() => router.push(redirectTo), 1200);
    } catch {
      toast.error('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
    if (!kakaoKey) {
      toast.error('카카오 로그인 준비 중입니다. 전화번호로 진행해 주세요.');
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth/kakao/callback`;
    const state = encodeURIComponent(redirectTo);
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}&scope=account_email,name,phone_number`;
    window.location.href = kakaoAuthUrl;
  };

  const goBack = () => {
    if (stage === 'otp') {
      setStage('intro');
      setOtp('');
    } else router.back();
  };

  const progress = stage === 'intro' ? (nameValid ? 40 : 20) : stage === 'otp' ? 70 : 100;

  const greetName = isReturningUser && existingName ? existingName : name.trim();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="safe-top sticky top-0 bg-[#0c0a09]/95 backdrop-blur-lg z-40">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
          {stage !== 'done' && stage !== 'terms' ? (
            <button onClick={goBack} className="touch-target w-10 h-10 -ml-2 flex items-center text-stone-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10" />
          )}
          <div className="w-6" />
          <div className="w-10" />
        </div>
        <div className="h-0.5 bg-white/5">
          <motion.div
            className="h-full bg-amber-600"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-6 pt-8 pb-32 flex flex-col">
        {stage === 'intro' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <h1 className="text-2xl font-bold text-white mb-2">
                어떻게 불러드릴까요?
              </h1>
              <p className="text-sm text-stone-500">계약서에 사용할 이름이에요</p>
            </motion.div>

            <div className="space-y-6 flex-1">
              <div>
                <label className="text-xs text-stone-500 mb-2 block">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="홍길동"
                  className="input-dark text-lg"
                  autoFocus
                  autoComplete="name"
                />
              </div>

              <AnimatePresence>
                {nameValid && (
                  <motion.div
                    initial={{ opacity: 0, y: -16, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -16, height: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="space-y-5 overflow-hidden"
                  >
                    <p className="text-base text-amber-500 pt-1">
                      {name.trim()}님, 반가워요 👋
                    </p>

                    <div>
                      <label className="text-xs text-stone-500 mb-2 block">전화번호</label>
                      <input
                        ref={phoneInputRef}
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(formatPhone(e.target.value))}
                        placeholder="010-1234-5678"
                        className="input-dark text-lg"
                        autoComplete="tel"
                        onKeyDown={e => e.key === 'Enter' && phoneValid && handleSendOtp()}
                      />
                      <p className="text-xs text-stone-600 mt-2">카카오톡으로 인증번호를 보내드려요</p>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex-1 h-px bg-white/8" />
                      <span className="text-xs text-stone-600">또는</span>
                      <div className="flex-1 h-px bg-white/8" />
                    </div>

                    <button
                      onClick={handleKakaoLogin}
                      className="w-full py-4 rounded-xl bg-[#FEE500] text-black font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    >
                      <MessageCircle className="w-5 h-5 fill-black" />
                      카카오로 빠르게 시작
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {stage === 'otp' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <h1 className="text-2xl font-bold text-white mb-2">
                {greetName ? `${greetName}님, ` : ''}인증번호를 입력해 주세요
              </h1>
              <p className="text-sm text-stone-500">
                {isReturningUser && existingName ? (
                  <>카카오톡을 확인해 주세요</>
                ) : (
                  <>{phone}로 보낸 6자리</>
                )}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <label className="text-xs text-stone-500 mb-2 flex justify-between items-center">
                <span>인증번호 (6자리)</span>
                {countdown > 0 ? (
                  <span className="text-amber-600 font-mono">
                    {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </span>
                ) : (
                  <button onClick={handleSendOtp} className="text-amber-600 underline">
                    재발송
                  </button>
                )}
              </label>
              <input
                ref={otpInputRef}
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(v);
                }}
                onKeyDown={e => e.key === 'Enter' && otp.length === 6 && handleVerifyOtp()}
                placeholder="000000"
                className="input-dark text-center text-3xl tracking-[0.5em] font-mono"
                autoComplete="one-time-code"
              />
              <p className="text-xs text-stone-600 mt-2">
                {otpChannel === 'alimtalk'
                  ? '📱 카카오톡 "도심창고:함 HAAM" 채널에서 확인해 주세요'
                  : '📱 문자 메시지를 확인해 주세요'}
              </p>
            </motion.div>
          </>
        )}

        {stage === 'terms' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <h1 className="text-2xl font-bold text-white mb-2">
                마지막 단계예요
              </h1>
              <p className="text-sm text-stone-500">
                {name.trim()}님, 약관에 동의해 주세요
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ConsentCheckboxes value={consent} onChange={setConsent} />
            </motion.div>
          </>
        )}

        {stage === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6"
            >
              <Check className="w-10 h-10 text-green-400" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-2"
            >
              {greetName ? `${greetName}님, 환영합니다!` : '환영합니다!'}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-stone-500"
            >
              잠시만 기다려 주세요...
            </motion.p>
          </div>
        )}
      </div>

      {stage !== 'done' && (
        <div className="sticky-bottom">
          <div className="max-w-lg mx-auto">
            {stage === 'intro' && (
              <button
                onClick={handleSendOtp}
                disabled={!nameValid || !phoneValid || loading}
                className="btn-primary w-full py-4 text-base gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    인증번호 받기
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
            {stage === 'otp' && (
              <button
                onClick={handleVerifyOtp}
                disabled={otp.length !== 6 || loading}
                className="btn-primary w-full py-4 text-base gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    확인
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
            {stage === 'terms' && (
              <button
                onClick={handleRegister}
                disabled={!consentValid || loading}
                className="btn-primary w-full py-4 text-base gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    {!consentValid ? '필수 약관에 동의해 주세요' : '시작하기'}
                    {consentValid && <ArrowRight className="w-5 h-5" />}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
