# PASS 본인인증 도입 가이드 (Phase 2)

## 개요

현재 Solapi SMS OTP로 인증하고 있으나, 정식 본인인증(PASS)으로 업그레이드하면:
- 통신사 3사(SK/KT/LG U+) 앱 연동 인증
- 사용자 경험 향상 (원탭 인증)
- 본인확인정보(CI/DI) 확보 → 중복 계정 방지, 정식 본인확인

## 권장 서비스: 포트원 + KG이니시스 통합본인인증

### 가격 (월 50건 기준)
- **건당 40원** → 월 약 2,000원
- 월 고정비 없음
- 현재 SMS OTP(건당 20원, 월 1,000원) 대비 월 1,000원 추가

### 가입 절차

#### 1단계: 포트원(PortOne) 계정 생성
- https://portone.io 회원가입
- 대시보드 로그인

#### 2단계: KG이니시스 통합본인인증 신청
- 포트원 대시보드 → **본인인증** → **KG이니시스** 신청
- 필요 서류:
  - 사업자등록증 (개인사업자 가능)
  - 통장 사본
  - 대표자 신분증
- 심사 소요: **1-2주**
- 심사 완료 후 MID(상점 ID) 발급

#### 3단계: 환경변수 추가
```bash
# .env.local에 추가
PORTONE_IMP_KEY=imp_xxxxx
PORTONE_IMP_SECRET=xxxxx
PORTONE_MID=INIiasTest  # KG이니시스 상점 ID
```

### 연동 난이도

**중간 수준.** 포트원 SDK를 사용하면 프론트엔드 1개 컴포넌트 + 백엔드 1개 엔드포인트만 필요.

#### 프론트엔드 (클라이언트 컴포넌트)
```typescript
// PortOne V2 브라우저 SDK
import PortOne from '@portone/browser-sdk/v2';

const response = await PortOne.requestIdentityVerification({
  storeId: 'store-id',
  identityVerificationId: `haam-${Date.now()}`,
  channelKey: 'channel-key', // 포트원 대시보드에서 발급
  customer: {
    fullName: '홍길동',
    phoneNumber: '01012345678',
  },
});

if (response.code !== undefined) {
  // 오류 처리
} else {
  // 성공 → 서버로 identityVerificationId 전달하여 검증
}
```

#### 백엔드 (검증 API)
```typescript
// /api/auth/verify-pass/route.ts
const res = await fetch(`https://api.portone.io/identity-verifications/${id}`, {
  headers: { Authorization: `PortOne ${process.env.PORTONE_IMP_SECRET}` },
});
const data = await res.json();
// data.verifiedCustomer: { name, phoneNumber, ci, di, gender, birthDate }
```

### 현재 구조와의 통합

현재 `/auth` 페이지는 SMS OTP 플로우를 따른다. PASS 도입 시:

#### 옵션 A: 완전 대체
- `/api/auth/send-otp`, `/verify-otp` 제거
- `/api/auth/verify-pass` 신규
- 프론트엔드: "PASS로 인증하기" 버튼만 표시

#### 옵션 B: 병행 제공 (권장)
- PASS 인증 버튼 (기본)
- "SMS로 받기" 대체 옵션 (fallback)
- 사용자 선택 가능

### 마이그레이션 체크리스트

- [ ] 포트원 계정 생성
- [ ] KG이니시스 신청 (사업자등록증 업로드)
- [ ] 심사 통과 대기 (1-2주)
- [ ] MID, channelKey 발급 확인
- [ ] 환경변수 추가
- [ ] `lib/pass.ts` 신규: 포트원 SDK 래퍼
- [ ] `src/app/api/auth/verify-pass/route.ts` 신규
- [ ] `src/app/auth/page.tsx` PASS 버튼 추가
- [ ] `customers` 테이블에 `ci`, `di` 컬럼 추가 (선택)
- [ ] 테스트 환경에서 검증
- [ ] 프로덕션 전환

### 참고 링크

- [포트원 본인인증 통합 가이드](https://guide.portone.io/6a1cba84-a99b-4ee1-a5a8-fffea0092399/)
- [포트원 V2 SDK 문서](https://developers.portone.io/docs/ko/auth/guide/v2/pg)
- [KG이니시스 통합본인인증](https://sign-service.inicis.com/)

### 도입 시점 권장

**라이브 후 1-2개월 시점** — 초기 운영 안정화 후 도입.
이유:
1. 가입 심사 1-2주 소요
2. 실제 고객 유입 후 본인인증 니즈 검증
3. CI/DI 보관은 개인정보보호법상 중요 — 운영 체계 잡힌 후
