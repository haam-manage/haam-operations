# 카카오 로그인 설정 가이드

HAAM의 "카카오로 시작하기" 버튼을 활성화하려면 카카오 개발자 센터에 앱을 등록해야 합니다.

## 준비물
- 카카오 계정 (개인 계정 가능)
- 사업자등록증 (전화번호 스코프 신청 시 필요)

---

## 1단계: 카카오 개발자 센터 앱 생성

1. https://developers.kakao.com 접속 → 카카오 로그인
2. 우측 상단 **내 애플리케이션** 클릭
3. **애플리케이션 추가하기** 클릭
4. 정보 입력:
   - 앱 이름: `도심창고:함 HAAM`
   - 사업자명: `도심창고:함`
   - 카테고리: 생활 / 편의
5. **저장**

---

## 2단계: API 키 확인

앱 생성 후 **앱 키** 메뉴로 이동:

| 키 종류 | 복사해 둘 위치 |
|---------|--------------|
| **REST API 키** | `.env.local`의 `NEXT_PUBLIC_KAKAO_REST_API_KEY` |

---

## 3단계: 플랫폼 등록

좌측 **플랫폼** 메뉴 → **Web 플랫폼 등록**:

```
사이트 도메인:
  http://localhost:3000   (개발용)
  https://haam.co.kr       (프로덕션용)
```

**저장**

---

## 4단계: 카카오 로그인 활성화

좌측 **카카오 로그인** 메뉴:

1. **활성화 설정** → **ON**
2. **Redirect URI 등록**:
   ```
   http://localhost:3000/api/auth/kakao/callback
   https://haam.co.kr/api/auth/kakao/callback
   ```
3. **OpenID Connect 활성화** → ON (권장)

---

## 5단계: 동의항목 설정 (가장 중요!)

좌측 **카카오 로그인 → 동의항목** 메뉴에서 아래 항목을 설정:

| 항목 | 설정 | 필수/선택 |
|------|------|----------|
| 프로필 정보(닉네임/프로필 사진) | 필수 동의 | 필수 |
| 카카오계정(이메일) | 필수 동의 | 필수 |
| **이름** | 필수 동의 | 필수 |
| **전화번호** | 필수 동의 | 필수 (아래 심사 필요) |

### 전화번호 스코프 신청 (1-3일 소요)

전화번호는 **기본 제공 안 됨** — 별도 신청 필요:

1. **이름** 및 **전화번호** 옆에 **"권한 신청"** 버튼 클릭
2. 신청 사유 예시:
   ```
   셀프스토리지 서비스 특성상 고객 본인 확인 및 보안코드 발송을 위해
   전화번호가 필수입니다. 개인정보처리방침에 명시된 수집 목적에
   따라 안전하게 관리합니다.
   ```
3. 사업자등록증 업로드
4. 심사 대기 (1-3일)

---

## 6단계: 환경변수 설정

`.env.local`에 추가:

```bash
# 카카오 로그인
NEXT_PUBLIC_KAKAO_REST_API_KEY=<REST API 키>
KAKAO_CLIENT_SECRET=<Client Secret, 선택사항>
```

**Client Secret은 선택사항**이지만 보안 강화를 위해 설정 권장:
- 카카오 개발자 센터 → **보안** → **Client Secret** → **코드 생성**
- **ON** 설정

---

## 7단계: Vercel 환경변수 설정 (프로덕션 배포 시)

Vercel 대시보드 → Settings → Environment Variables:

```
NEXT_PUBLIC_KAKAO_REST_API_KEY = <REST API 키>
KAKAO_CLIENT_SECRET = <Client Secret>
```

---

## 8단계: 테스트

1. `pnpm dev` 실행
2. `http://localhost:3000/auth` 접속
3. **"카카오로 시작하기"** 클릭
4. 카카오 동의 화면 → 이름/전화번호 동의
5. 자동으로 `/my` 또는 지정 경로로 리다이렉트
6. Supabase `customers` 테이블에 새 줄이 추가되는지 확인

---

## 문제 해결

### "KOE010" 에러
- Redirect URI 불일치 — 4단계에서 등록한 URI와 정확히 일치하는지 확인

### 전화번호가 null로 오는 경우
- 5단계 전화번호 스코프 심사가 아직 안 끝난 상태
- 심사 완료 후 동의항목 재설정

### "Invalid client" 에러
- `NEXT_PUBLIC_KAKAO_REST_API_KEY` 값 확인
- 앱 삭제했다가 새로 만든 경우 키 재발급 필요

### 개인 카카오톡 친구 초대로만 테스트 가능
- 카카오 로그인 서비스 활성화 전에는 **등록된 팀원만** 로그인 가능
- 테스트 후 **비즈 앱 전환** 신청하면 모든 사용자에게 공개

---

## 비용

- 카카오 로그인 API: **무료** (일 10만 건 한도)
- 전화번호 스코프: **무료** (심사만 통과하면)
- HAAM 월 예상 50건 → 평생 무료

---

## 참고 링크

- [카카오 로그인 개발자 가이드](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
- [REST API 방식 로그인](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [개인정보 동의항목 설정](https://developers.kakao.com/console/app)
