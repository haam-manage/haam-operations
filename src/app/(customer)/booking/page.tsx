'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Check, CreditCard, Lock, ChevronRight, Package, Clock, Calendar, User, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { StepLayout } from '../../../components/StepLayout';
import { Button } from '../../../components/Button';
import { Input, formatPhone } from '../../../components/Input';
import { BottomSheet } from '../../../components/BottomSheet';
import type { CabinetSize } from '../../../../lib/price';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface PriceBreakdown {
  basePrice: number;
  monthlyPrice: number;
  billableMonths: number;
  freeMonths: number;
  totalRental: number;
  deposit: number;
  totalAmount: number;
  discountRate: number;
}

const SIZE_INFO: Record<string, { name: string; price: number; deposit: number; maxUsers: number; image: string; dimension: string; desc: string }> = {
  M:  { name: '소중:함', price: 70_000, deposit: 70_000, maxUsers: 2, image: '/images/3.png', dimension: '100 × 100 × 110cm', desc: '겨울 옷, 캠핑 장비, 스포츠 용품' },
  L:  { name: '든든:함', price: 120_000, deposit: 120_000, maxUsers: 3, image: '/images/6.png', dimension: '90 × 110 × 220cm', desc: '사계절 의류, 골프백, 여행 가방' },
  XL: { name: '넉넉:함', price: 200_000, deposit: 200_000, maxUsers: 4, image: '/images/5.png', dimension: '200 × 100 × 220cm', desc: '대형 스포츠 장비, 이불, 가전제품' },
};

const DURATIONS = [
  { m: 1, label: '1개월', discount: '' },
  { m: 3, label: '3개월', discount: '10% 할인' },
  { m: 6, label: '6개월', discount: '15% 할인' },
  { m: 12, label: '12개월', discount: '20% 할인' },
];

export default function BookingPage() {
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [selectedSize, setSelectedSize] = useState<CabinetSize | null>(null);
  const [selectedCabinet, setSelectedCabinet] = useState('');
  const [months, setMonths] = useState(1);
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderId: string } | null>(null);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/cabinets')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.cabinets) return;
        const map: Record<string, boolean> = {};
        for (const c of data.cabinets as { number: string; isAvailable: boolean }[]) {
          map[c.number] = c.isAvailable;
        }
        setAvailability(map);
      })
      .catch(() => {});
  }, []);

  const goTo = useCallback((s: Step, dir: 'forward' | 'back' = 'forward') => {
    setDirection(dir);
    setStep(s);
  }, []);

  const haptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const estimatedPrice = selectedSize
    ? calculateEstimate(SIZE_INFO[selectedSize].price, months)
    : null;

  // ─── Step 1: Size Selection ───
  if (step === 1) {
    return (
      <StepLayout
        step={1} totalSteps={7}
        title="어떤 크기가 필요하세요?"
        subtitle="Step 1 · 사이즈"
        bottomCTA={
          <Button
            variant="primary"
            className="w-full py-4 text-base"
            disabled={!selectedSize}
            onClick={() => goTo(2)}
          >
            다음
            <ChevronRight className="w-5 h-5" />
          </Button>
        }
      >
        <div className="space-y-3">
          {(['M', 'L', 'XL'] as CabinetSize[]).map(size => {
            const info = SIZE_INFO[size];
            const selected = selectedSize === size;
            return (
              <button
                key={size}
                onClick={() => { setSelectedSize(size); setSelectedCabinet(''); haptic(); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 text-left active:scale-[0.98] ${
                  selected ? 'glass-warm glow-warm' : 'glass'
                }`}
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative">
                  <Image src={info.image} alt={size} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{info.name}</span>
                    <span className="text-xs text-stone-600">{size}</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mb-1">{info.desc}</p>
                  <p className="text-sm font-semibold text-white">월 ₩{info.price.toLocaleString()}</p>
                </div>
                {selected && (
                  <div className="w-7 h-7 rounded-full bg-amber-700 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </StepLayout>
    );
  }

  // ─── Step 2: Cabinet Number ───
  if (step === 2) {
    const activeSize: CabinetSize = selectedSize ?? 'M';
    const nums = getCabinetNumbers(activeSize);
    const availableCount = nums.filter(n => availability[n] !== false).length;

    const switchSize = (size: CabinetSize) => {
      if (size === selectedSize) return;
      setSelectedSize(size);
      setSelectedCabinet('');
      haptic();
    };

    return (
      <StepLayout
        step={2} totalSteps={7}
        title="보관함을 선택하세요"
        subtitle="Step 2 · 보관함"
        onBack={() => goTo(1, 'back')}
        direction={direction}
        bottomCTA={
          <Button variant="primary" className="w-full py-4 text-base" disabled={!selectedCabinet} onClick={() => goTo(3)}>
            {selectedCabinet ? `${selectedCabinet} 선택 · 다음` : '보관함을 고르세요'}
            <ChevronRight className="w-5 h-5" />
          </Button>
        }
      >
        {/* 사이즈 필터 탭 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['M', 'L', 'XL'] as CabinetSize[]).map(size => {
            const total = size === 'M' ? 46 : size === 'L' ? 13 : 2;
            const available = getCabinetNumbers(size).filter(n => availability[n] !== false).length;
            const active = activeSize === size;
            return (
              <button
                key={size}
                onClick={() => switchSize(size)}
                className={`py-3 rounded-xl text-center transition-all duration-150 touch-target ${
                  active
                    ? 'bg-amber-900/30 border border-amber-700/40 text-amber-400'
                    : 'bg-white/3 border border-white/5 text-stone-400 active:bg-white/6'
                }`}
              >
                <div className="text-sm font-bold">{SIZE_INFO[size].name}</div>
                <div className={`text-[10px] mt-0.5 ${active ? 'text-amber-500/80' : 'text-stone-600'}`}>
                  {size} · {available}/{total}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-stone-500 mb-3">
          남은 보관함 <span className="text-amber-500 font-semibold">{availableCount}</span>/{nums.length}
        </p>

        {/* 확대 3열 그리드 — 터치 타깃 48px+ */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {nums.map(num => {
            const isTaken = availability[num] === false;
            const isSel = selectedCabinet === num;
            return (
              <button
                key={num}
                disabled={isTaken}
                onClick={() => { setSelectedCabinet(num); haptic(); }}
                className={`py-4 rounded-xl text-base font-mono font-semibold transition-all duration-150 min-h-[56px] ${
                  isSel
                    ? 'bg-amber-600 text-black shadow-[0_0_0_2px_rgba(251,191,36,0.4)]'
                    : isTaken
                      ? 'bg-stone-800/60 text-stone-600 cursor-not-allowed line-through'
                      : 'bg-green-900/30 border border-green-800/30 text-green-400 active:bg-green-900/50'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex justify-around text-[11px] text-stone-500 mb-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-900/60 border border-green-800/40" />가능
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-stone-800" />사용중
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-600" />선택
          </span>
        </div>

        {/* 미니맵 — 매장 속 선택 위치 */}
        <CabinetMinimap selectedSize={activeSize} selectedCabinet={selectedCabinet} />
      </StepLayout>
    );
  }

  // ─── Step 3: Duration + Date ───
  if (step === 3) {
    return (
      <StepLayout
        step={3} totalSteps={7}
        title="기간을 선택하세요"
        subtitle="Step 3 · 기간"
        onBack={() => goTo(2, 'back')}
        direction={direction}
        bottomCTA={
          <Button variant="primary" className="w-full py-4 text-base" onClick={() => goTo(4)}>
            {estimatedPrice ? (
              <span>₩{estimatedPrice.toLocaleString()} · 다음</span>
            ) : (
              <span>다음</span>
            )}
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Duration buttons */}
          <div className="grid grid-cols-2 gap-3">
            {DURATIONS.map(({ m, label, discount }) => (
              <button
                key={m}
                onClick={() => { setMonths(m); haptic(); }}
                className={`py-4 px-4 rounded-2xl text-left transition-all duration-200 touch-target ${
                  months === m
                    ? 'glass-warm glow-warm'
                    : 'glass active:bg-white/5'
                }`}
              >
                <div className="text-base font-semibold text-white">{label}</div>
                {discount && <div className="text-xs text-amber-600 mt-0.5">{discount}</div>}
              </button>
            ))}
          </div>

          {/* Price preview */}
          {estimatedPrice && selectedSize && (
            <div className="glass-warm p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-400">예상 결제금액</span>
                <span className="text-lg font-bold text-white">₩{estimatedPrice.toLocaleString()}</span>
              </div>
              <p className="text-xs text-stone-600 mt-1">보증금 ₩{SIZE_INFO[selectedSize].deposit.toLocaleString()} 포함</p>
            </div>
          )}

          {/* Start date */}
          <div>
            <label className="text-xs text-stone-500 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              시작일
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              min={getDefaultStartDate()}
              className="input-dark"
            />
          </div>
        </div>
      </StepLayout>
    );
  }

  // ─── Step 4: Customer Info ───
  if (step === 4) {
    const validateAndProceed = () => {
      let valid = true;
      setNameError('');
      setPhoneError('');

      if (!name.trim()) {
        setNameError('이름을 입력해 주세요');
        valid = false;
      }
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone.match(/^01[016789]\d{7,8}$/)) {
        setPhoneError('올바른 연락처를 입력해 주세요');
        valid = false;
      }
      if (valid) {
        setShowConfirm(true);
      }
    };

    return (
      <StepLayout
        step={4} totalSteps={7}
        title="정보를 입력해 주세요"
        subtitle="Step 4 · 고객 정보"
        onBack={() => goTo(3, 'back')}
        direction={direction}
        bottomCTA={
          <Button variant="primary" className="w-full py-4 text-base" onClick={validateAndProceed}>
            <CreditCard className="w-5 h-5" />
            결제하기
          </Button>
        }
      >
        <div className="space-y-5">
          <Input
            label="이름"
            icon={<User className="w-3.5 h-3.5" />}
            placeholder="홍길동"
            value={name}
            onChange={e => { setName(e.target.value); setNameError(''); }}
            error={nameError}
          />
          <Input
            label="연락처"
            icon={<Phone className="w-3.5 h-3.5" />}
            type="tel"
            placeholder="010-1234-5678"
            value={phone}
            onChange={e => { setPhone(formatPhone(e.target.value)); setPhoneError(''); }}
            error={phoneError}
          />
          <Input
            label="이메일 (선택)"
            icon={<Mail className="w-3.5 h-3.5" />}
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {/* ─── Confirm Bottom Sheet ─── */}
        <BottomSheet open={showConfirm} onOpenChange={setShowConfirm} title="주문 확인">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3">
              <Package className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-white">{selectedCabinet} · {selectedSize && SIZE_INFO[selectedSize].name}</p>
                <p className="text-xs text-stone-500">{months}개월 · {startDate} 시작</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-stone-400">
                <span>고객명</span>
                <span className="text-white">{name}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>연락처</span>
                <span className="text-white">{phone}</span>
              </div>
              {estimatedPrice && (
                <>
                  <div className="divider" />
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-white">예상 결제금액</span>
                    <span className="gradient-text-warm">₩{estimatedPrice.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>

            <Button
              variant="primary"
              className="w-full py-4 text-base mt-4"
              loading={isSubmitting}
              onClick={handleSubmitOrder}
            >
              <CreditCard className="w-5 h-5" />
              결제 진행
            </Button>
          </div>
        </BottomSheet>
      </StepLayout>
    );
  }

  // ─── Step 5/6: Payment (Toss Widget) ───
  if (step === 5 || step === 6) {
    return (
      <StepLayout
        step={6} totalSteps={7}
        title="결제"
        subtitle="Step 6"
        direction={direction}
      >
        {priceBreakdown && (
          <div className="glass p-5 mb-6 space-y-3 text-sm">
            <div className="flex justify-between text-stone-400">
              <span>렌탈료</span>
              <span>₩{priceBreakdown.totalRental.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>보증금</span>
              <span>₩{priceBreakdown.deposit.toLocaleString()}</span>
            </div>
            <div className="divider" />
            <div className="flex justify-between text-lg font-bold">
              <span className="text-white">총 결제금액</span>
              <span className="gradient-text-warm">₩{priceBreakdown.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="glass p-10 text-center">
          <CreditCard className="w-8 h-8 text-stone-700 mx-auto mb-3" />
          <p className="text-stone-500 text-sm mb-1">토스페이먼츠 결제 위젯</p>
          <p className="text-xs text-stone-700">결제 위젯이 여기에 렌더링됩니다</p>
        </div>
      </StepLayout>
    );
  }

  // ─── Step 7: Complete ───
  return (
    <StepLayout step={7} totalSteps={7} title="" direction={direction}>
      <div className="text-center py-8 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/15 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">예약 완료!</h2>
        <p className="text-stone-400 text-sm mb-8">카카오톡으로 보안코드가 발송됩니다.</p>
        <div className="glass p-5 inline-flex items-center gap-2 text-sm text-stone-400">
          <Lock className="w-4 h-4 text-amber-600" />
          마이페이지에서도 보안코드를 확인할 수 있습니다
        </div>
      </div>
    </StepLayout>
  );

  async function handleSubmitOrder() {
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: phone.replace(/\D/g, ''),
          email: email || undefined,
          cabinetNumber: selectedCabinet,
          months,
          startDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || '주문 생성에 실패했습니다');
        setShowConfirm(false);
        return;
      }

      setPriceBreakdown(data.priceBreakdown);
      setOrderResult({ orderId: data.orderId });
      setShowConfirm(false);
      goTo(6);
    } catch {
      toast.error('네트워크 오류가 발생했습니다');
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  }
}

/* ─── Helpers ─── */

function getCabinetNumbers(size: CabinetSize): string[] {
  const nums: string[] = [];
  const max = size === 'M' ? 46 : size === 'L' ? 13 : 2;
  for (let i = 1; i <= max; i++) {
    nums.push(`${size}${String(i).padStart(2, '0')}`);
  }
  return nums;
}

function getDefaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function calculateEstimate(monthlyPrice: number, months: number): number {
  const discountRates: Record<number, number> = { 1: 0, 3: 0.1, 6: 0.15, 12: 0.2 };
  const rate = discountRates[months] ?? 0;
  const rental = Math.round(monthlyPrice * months * (1 - rate));
  return rental + monthlyPrice; // rental + deposit
}

/* ─── 매장 미니맵 (숭실대입구점) ─── */
function CabinetMinimap({ selectedSize, selectedCabinet }: { selectedSize: CabinetSize; selectedCabinet: string }) {
  // 각 사이즈의 존 좌표 (viewBox 100×64 기준)
  const marker = getMarkerPosition(selectedCabinet);
  const mActive = selectedSize === 'M';
  const lActive = selectedSize === 'L';
  const xActive = selectedSize === 'XL';

  const dim = '#292524';
  const active = '#14532d';
  const amber = '#fbbf24';

  return (
    <div className="p-3 rounded-xl bg-stone-950/60 border border-white/5">
      <p className="text-[11px] text-stone-500 text-center mb-2">📍 매장 속 내 위치</p>
      <svg viewBox="0 0 100 64" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="98" height="62" fill="none" stroke="#44403c" rx="2" />
        <text x="50" y="8" fontSize="4.5" fill="#57534e" textAnchor="middle">▼ 입구</text>

        {/* 상단: XL02(좌), XL01(우) + 주변 M */}
        <rect x="4"  y="12" width="14" height="7" fill={xActive ? active : dim} rx="1" />
        <text x="11" y="17.5" fontSize="3.5" fill={xActive ? '#86efac' : '#57534e'} textAnchor="middle">XL2</text>
        <rect x="82" y="12" width="14" height="7" fill={xActive ? active : dim} rx="1" />
        <text x="89" y="17.5" fontSize="3.5" fill={xActive ? '#86efac' : '#57534e'} textAnchor="middle">XL1</text>
        <rect x="20" y="12" width="28" height="7" fill={mActive ? active : dim} rx="1" />
        <rect x="52" y="12" width="28" height="7" fill={mActive ? active : dim} rx="1" />

        {/* 중앙: 좌블록 + 우블록 (M) */}
        <rect x="6"  y="24" width="40" height="20" fill={mActive ? active : dim} rx="1" />
        <text x="26" y="36" fontSize="5" fill={mActive ? '#86efac' : '#57534e'} textAnchor="middle">M</text>
        <rect x="54" y="24" width="40" height="20" fill={mActive ? active : dim} rx="1" />
        <text x="74" y="36" fontSize="5" fill={mActive ? '#86efac' : '#57534e'} textAnchor="middle">M</text>

        {/* 하단: L 13개 라인 */}
        <rect x="4" y="50" width="92" height="10" fill={lActive ? active : dim} rx="1" />
        <text x="8" y="57" fontSize="4" fill={lActive ? '#86efac' : '#57534e'} textAnchor="middle">L</text>

        {/* 선택된 보관함 마커 */}
        {marker && selectedCabinet && (
          <>
            <circle cx={marker.x} cy={marker.y} r="3.8" fill={amber} stroke="#fde68a" strokeWidth="0.8" />
            <text x={marker.x} y={marker.y + 1.5} fontSize="3" fill="#1c1917" textAnchor="middle" fontWeight="700">
              {selectedCabinet.replace(/^(M|L|XL)0?/, '')}
            </text>
          </>
        )}
      </svg>
      {selectedCabinet && (
        <p className="text-[11px] text-amber-500 text-center mt-2 font-medium">{selectedCabinet} 위치</p>
      )}
    </div>
  );
}

function getMarkerPosition(num: string): { x: number; y: number } | null {
  if (!num) return null;
  if (num.startsWith('XL')) {
    const n = parseInt(num.slice(2), 10);
    return n === 1 ? { x: 89, y: 15.5 } : { x: 11, y: 15.5 };
  }
  if (num.startsWith('L')) {
    const n = parseInt(num.slice(1), 10);
    // L01 = 오른쪽 끝, L13 = 왼쪽 끝
    const x = 92 - ((n - 1) / 12) * 84;
    return { x, y: 55 };
  }
  if (num.startsWith('M')) {
    const n = parseInt(num.slice(1), 10);
    // M01~M10: 우블록 윗줄 / M11~M20: 좌블록 윗줄 / M21~M26: 상단 좌
    // M27~M34: 우블록 아랫줄 / M35~M46: 좌블록 아랫줄
    if (n >= 1 && n <= 10) {
      // 우블록 윗줄 (y≈28)
      const col = (n - 1) % 5;
      return { x: 60 + col * 8, y: 29 };
    }
    if (n >= 11 && n <= 20) {
      const col = (n - 11) % 5;
      return { x: 10 + col * 8, y: 29 };
    }
    if (n >= 21 && n <= 26) {
      const col = (n - 21) % 6;
      return { x: 22 + col * 4.5, y: 15.5 };
    }
    if (n >= 27 && n <= 34) {
      const col = (n - 27) % 4;
      return { x: 60 + col * 8, y: 39 };
    }
    if (n >= 35 && n <= 46) {
      const col = (n - 35) % 6;
      return { x: 10 + col * 6, y: 39 };
    }
  }
  return null;
}
