'use client';

import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

export interface ConsentState {
  age14: boolean;
  terms: boolean;
  privacy: boolean;
  marketing: boolean;
}

interface ConsentCheckboxesProps {
  value: ConsentState;
  onChange: (value: ConsentState) => void;
}

export function ConsentCheckboxes({ value, onChange }: ConsentCheckboxesProps) {
  const [viewTerms, setViewTerms] = useState<'terms' | 'privacy' | 'marketing' | null>(null);

  const allRequiredChecked = value.age14 && value.terms && value.privacy;
  const allChecked = allRequiredChecked && value.marketing;

  const toggleAll = () => {
    const newValue = !allChecked;
    onChange({
      age14: newValue,
      terms: newValue,
      privacy: newValue,
      marketing: newValue,
    });
  };

  const toggle = (key: keyof ConsentState) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <>
      <div className="space-y-3">
        {/* 모두 동의 */}
        <button
          onClick={toggleAll}
          className="w-full flex items-center gap-3 p-4 glass-warm rounded-xl active:scale-[0.98] transition-transform"
        >
          <CheckCircle checked={allChecked} size="lg" />
          <span className="text-base font-semibold text-white">모두 동의합니다</span>
        </button>

        <div className="h-px bg-white/5 mx-2" />

        {/* 개별 항목 */}
        <CheckRow
          checked={value.age14}
          required
          label="만 14세 이상입니다"
          onToggle={() => toggle('age14')}
        />
        <CheckRow
          checked={value.terms}
          required
          label="서비스 이용약관"
          onToggle={() => toggle('terms')}
          onView={() => setViewTerms('terms')}
        />
        <CheckRow
          checked={value.privacy}
          required
          label="개인정보 수집·이용 동의"
          onToggle={() => toggle('privacy')}
          onView={() => setViewTerms('privacy')}
        />
        <CheckRow
          checked={value.marketing}
          label="마케팅 정보 수신 (선택)"
          onToggle={() => toggle('marketing')}
          onView={() => setViewTerms('marketing')}
        />
      </div>

      {/* 약관 바텀시트 */}
      <BottomSheet
        open={viewTerms !== null}
        onOpenChange={(open) => !open && setViewTerms(null)}
        title={
          viewTerms === 'terms' ? '서비스 이용약관' :
          viewTerms === 'privacy' ? '개인정보 수집·이용 동의' :
          viewTerms === 'marketing' ? '마케팅 정보 수신 동의' : ''
        }
      >
        <div className="text-sm text-stone-300 leading-relaxed space-y-4">
          {viewTerms === 'terms' && <TermsContent />}
          {viewTerms === 'privacy' && <PrivacyContent />}
          {viewTerms === 'marketing' && <MarketingContent />}
        </div>
      </BottomSheet>
    </>
  );
}

function CheckRow({
  checked, required, label, onToggle, onView,
}: {
  checked: boolean;
  required?: boolean;
  label: string;
  onToggle: () => void;
  onView?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-2">
      <button onClick={onToggle} className="touch-target p-2 -ml-2 flex items-center">
        <CheckCircle checked={checked} />
      </button>
      <button onClick={onToggle} className="flex-1 py-2 text-left">
        <span className="text-sm text-stone-300">
          {required && <span className="text-amber-500 mr-1">[필수]</span>}
          {!required && <span className="text-stone-500 mr-1">[선택]</span>}
          {label}
        </span>
      </button>
      {onView && (
        <button onClick={onView} className="touch-target p-2 text-stone-500">
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function CheckCircle({ checked, size = 'md' }: { checked: boolean; size?: 'md' | 'lg' }) {
  const sizeClasses = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center transition-colors ${
        checked
          ? 'bg-amber-600 text-white'
          : 'bg-white/5 border border-white/15'
      }`}
    >
      {checked && <Check className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} strokeWidth={3} />}
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <p className="font-semibold text-white">제1조 (목적)</p>
      <p>본 약관은 도심창고:함(HAAM, 이하 &quot;회사&quot;)이 제공하는 셀프스토리지 서비스의 이용조건 및 절차, 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>

      <p className="font-semibold text-white mt-4">제2조 (서비스 이용)</p>
      <p>1. 회사는 보관함을 월 단위로 임대하는 서비스를 제공합니다.<br/>
      2. 이용자는 전화번호 인증 또는 카카오 계정으로 가입할 수 있습니다.<br/>
      3. 서비스 이용 시 발급되는 보안코드는 본인 및 등록된 공동사용자만 사용 가능합니다.</p>

      <p className="font-semibold text-white mt-4">제3조 (계약 기간 및 요금)</p>
      <p>1. 이용 기간은 1개월, 3개월, 6개월, 12개월 중 선택 가능합니다.<br/>
      2. 보증금은 계약 체결 시 1회 수납하며, 계약 종료 후 3일 이내 반환됩니다.<br/>
      3. 장기 이용 시 3개월 10%, 6개월 15%, 12개월 20% 할인이 적용됩니다.</p>

      <p className="font-semibold text-white mt-4">제4조 (금지 행위)</p>
      <p>다음 물품의 보관은 금지됩니다: 인화성/폭발성 물질, 불법 물품, 부패성 식품, 생물, 현금/귀중품 등</p>

      <p className="font-semibold text-white mt-4">제5조 (계약 해지)</p>
      <p>만료일까지 재계약하지 않으면 계약이 종료되며, 이후 3일 이내 보관물을 반출해야 합니다. 미반출 시 회사는 보관물을 임의로 처분할 수 있습니다.</p>

      <p className="text-xs text-stone-500 mt-6">시행일: 2026년 4월 16일</p>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="font-semibold text-white">1. 수집하는 개인정보 항목</p>
      <p>- 필수: 이름, 전화번호<br/>
      - 선택: 이메일, 카카오 계정 정보(카카오 로그인 시)</p>

      <p className="font-semibold text-white mt-4">2. 수집 및 이용 목적</p>
      <p>- 회원 가입·관리 및 본인확인<br/>
      - 계약 체결 및 보관함 이용<br/>
      - 보안코드 및 알림톡 발송<br/>
      - 결제 처리 및 환불<br/>
      - 고객 문의 응대</p>

      <p className="font-semibold text-white mt-4">3. 보유 및 이용 기간</p>
      <p>- 회원 탈퇴 시까지 또는 관련 법령에 따른 보존 기간<br/>
      - 전자상거래법: 계약·결제 기록 5년<br/>
      - 통신비밀보호법: 발신번호 기록 1년</p>

      <p className="font-semibold text-white mt-4">4. 제3자 제공</p>
      <p>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 결제 처리를 위해 토스페이먼츠(주)에 필요 최소한의 정보를 제공합니다.</p>

      <p className="font-semibold text-white mt-4">5. 동의 거부권</p>
      <p>이용자는 개인정보 수집에 거부할 권리가 있으나, 거부 시 서비스 이용이 제한될 수 있습니다.</p>

      <p className="text-xs text-stone-500 mt-6">시행일: 2026년 4월 16일</p>
    </>
  );
}

function MarketingContent() {
  return (
    <>
      <p className="font-semibold text-white">마케팅 정보 수신 동의 (선택)</p>
      <p>HAAM에서 제공하는 각종 이벤트, 할인 프로모션, 신규 서비스 소식을 카카오톡·문자·이메일로 받아보실 수 있습니다.</p>

      <p className="font-semibold text-white mt-4">수신 정보</p>
      <p>- 할인 프로모션 안내<br/>
      - 이벤트 및 경품 이벤트<br/>
      - 신규 서비스 출시 소식<br/>
      - 재계약 혜택 안내</p>

      <p className="font-semibold text-white mt-4">동의 거부</p>
      <p>본 동의는 선택 사항이며, 거부하셔도 서비스 이용에는 제한이 없습니다. 언제든 마이페이지에서 수신 거부 설정이 가능합니다.</p>
    </>
  );
}
