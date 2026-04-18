'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { formatPhone } from '../../components/Input';
import { ConsentCheckboxes, type ConsentState } from '../../components/ConsentCheckboxes';

type Stage = 'phone' | 'otp' | 'name' | 'done';

interface Props {
  redirectTo: string;
}

export default function AuthClient({ redirectTo }: Props) {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('phone');
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

  const otpInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // OTP 카운트다운
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Stage 변경 시 자동 포커스
  useEffect(() => {
    if (stage === 'otp') setTimeout(() => otpInputRef.current?.focus(), 400);
    if (stage === 'name') setTimeout(() => nameInputRef.current?.focus(), 400);
  }, [stage]);

  // OTP 6자리 입력 완료 시 자동 검증 (stale closure 방지)
  useEffect(() => {
    if (otp.length === 6 && stage === 'otp' && !loading) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, stage]);

  // 전화번호 입력 후 OTP 발송
  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.match(/^01[016789]\d{7,8}$/)) {
      toast.error('올바른 전화번호를 입력해 주세요');
      return;
    }

    setLoading(true);
    try {
      // 1. 기존 회원 여부 확인
      const checkRes = await fetch('/api/auth/check-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const checkData = await checkRes.json();
      setIsReturningUser(checkData.exists);
      setExistingName(checkData.name);

      // 2. OTP 발송 (카카오 알림톡)
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

  // OTP 검증
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
          // 재방문자는 name 전달 안 함 (기존 DB 이름 사용)
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
        // 신규 회원: 이름 입력 단계로
        setStage('name');
      } else {
        // 기존 회원: 바로 완료
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

  // 신규 회원 이름 등록
  const handleRegister = async () => {
    if (!name.trim()) {
      toast.error('이름을 입력해 주세요');
      return;
    }
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

  // 카카오 로그인
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
      setStage('phone');
      setOtp('');
    } else if (stage === 'name') {
      setStage('phone');
      setOtp('');
      setName('');
    } else router.back();
  };

  const progress = stage === 'phone' ? 33 : stage === 'otp' ? 66 : 100;

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="safe-top sticky top-0 bg-[#0c0a09]/95 backdrop-blur-lg z-40">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
          {stage !== 'done' ? (
            <button onClick={goBack} className="touch-target w-10 h-10 -ml-2 flex items-center text-stone-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10" />
          )}
          <Image src="/images/HAAM_LOGO(S)_001.jpg" alt="HAAM" width={24} height={24} className="rounded-md" />
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
        {stage !== 'done' ? (
          <>
            {/* 인사말 */}
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              {stage === 'phone' && (
                <>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    반갑습니다
                  </h1>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    전화번호를 입력해 주세요
                  </h1>
                  <p className="text-sm text-stone-500">카카오톡으로 인증번호를 보내드려요</p>
                </>
              )}
              {stage === 'otp' && (
                <>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    인증번호를 입력해 주세요
                  </h1>
                  <p className="text-sm text-stone-500">
                    {isReturningUser && existingName ? (
                      <>{existingName}님, 카카오톡을 확인해 주세요</>
                    ) : (
                      <>{phone}로 보낸 6자리</>
                    )}
                  </p>
                </>
              )}
              {stage === 'name' && (
                <>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    처음 오셨네요!
                  </h1>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    어떻게 불러드릴까요?
                  </h1>
                  <p className="text-sm text-stone-500">계약서에 사용할 이름이에요</p>
                </>
              )}
            </motion.div>

            {/* 입력 영역 */}
            <div className="space-y-5 flex-1">
              {/* Stage: Phone */}
              {stage === 'phone' && (
                <>
                  {/* 카카오 로그인 버튼 */}
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    onClick={handleKakaoLogin}
                    className="w-full py-4 rounded-xl bg-[#FEE500] text-black font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <MessageCircle className="w-5 h-5 fill-black" />
                    카카오로 시작하기
                  </motion.button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-xs text-stone-600">또는</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>

                  {/* 전화번호 입력 */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <label className="text-xs text-stone-500 mb-2 block">전화번호</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(formatPhone(e.target.value))}
                      placeholder="010-1234-5678"
                      className="input-dark text-lg"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    />
                  </motion.div>
                </>
              )}

              {/* Stage: OTP */}
              {stage === 'otp' && (
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
              )}

              {/* Stage: Name (신규 회원만) */}
              {stage === 'name' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="text-xs text-stone-500 mb-2 block">이름</label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="홍길동"
                      className="input-dark text-lg"
                    />
                  </div>

                  {/* 약관 동의 */}
                  <div>
                    <label className="text-xs text-stone-500 mb-3 block">약관 동의</label>
                    <ConsentCheckboxes value={consent} onChange={setConsent} />
                  </div>
                </motion.div>
              )}
            </div>
          </>
        ) : (
          /* Done */
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
              {isReturningUser ? '환영합니다!' : `${name}님, 환영합니다!`}
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

      {/* Sticky CTA */}
      {stage !== 'done' && stage !== 'otp' && (
        <div className="sticky-bottom">
          <div className="max-w-lg mx-auto">
            {stage === 'phone' && (
              <button
                onClick={handleSendOtp}
                disabled={phone.replace(/\D/g, '').length < 10 || loading}
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
            {stage === 'name' && (
              <button
                onClick={handleRegister}
                disabled={!name.trim() || !consentValid || loading}
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
