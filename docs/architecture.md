# HAAM 운영시스템 아키텍처

## 기술 스택 (확정)

| 항목 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js App Router | 16.2.4 |
| 런타임 | React | 19.2.4 |
| 언어 | TypeScript strict | 5.x |
| DB | Supabase (Postgres) | - |
| ORM | Drizzle ORM | 0.45.x |
| 스타일링 | Tailwind CSS | 4.x |
| UI 컴포넌트 | shadcn/ui | - |
| 결제 | 토스페이먼츠 위젯 SDK | - |
| 알림톡 | Solapi Messages API | v4 |
| 배포 | Vercel | - |
| 테스트 | Vitest (단위) + Playwright (E2E) | - |
| 패키지 매니저 | pnpm | 10.x |

## 도메인

- 프로덕션: `haam.co.kr`
- 프리뷰: `*.vercel.app`

## 디렉토리 구조

```
haam-operations/
├── src/app/           # Next.js App Router
│   ├── (customer)/    # 고객용 (예약, 마이페이지, 재계약)
│   ├── (admin)/       # 관리자 대시보드
│   └── api/           # Route Handlers (webhooks, cron, qr-queue)
├── lib/               # 비즈니스 로직 (price, status, validation, alimtalk, toss)
├── db/                # Drizzle 스키마 + 마이그레이션
├── components/        # 공유 UI 컴포넌트
├── docs/              # 프로젝트 문서
├── legacy-gas/        # 기존 GAS 원본 (읽기 전용)
├── output/            # Phase별 산출물
└── tests/             # 단위/E2E 테스트
```

## 환경변수 목록

| 변수 | 용도 | 공개 여부 |
|------|------|----------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 프로젝트 URL | 공개 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 익명 키 | 공개 |
| SUPABASE_SERVICE_ROLE_KEY | Supabase 서비스 역할 키 | 비밀 |
| DATABASE_URL | Postgres 직접 연결 (Drizzle) | 비밀 |
| NEXT_PUBLIC_TOSS_CLIENT_KEY | 토스 클라이언트 키 | 공개 |
| TOSS_SECRET_KEY | 토스 시크릿 키 | 비밀 |
| TOSS_WEBHOOK_SECRET | 토스 웹훅 시크릿 | 비밀 |
| SOLAPI_API_KEY | Solapi API 키 | 비밀 |
| SOLAPI_API_SECRET | Solapi API 시크릿 | 비밀 |
| SOLAPI_SENDER_NUMBER | 발신 번호 | 비밀 |
| SOLAPI_PFID | 플러스친구 ID | 비밀 |
| TELEGRAM_BOT_TOKEN | 텔레그램 봇 토큰 | 비밀 |
| TELEGRAM_CHAT_ID | 관리자 채팅방 ID | 비밀 |

## 배포 전략

- `main` 브랜치 → 프로덕션 자동 배포
- PR → Vercel Preview 자동 배포
- 수동 롤백: Vercel 대시보드에서 이전 배포로 복원
