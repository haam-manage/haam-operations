# next-scaffold 스킬

## 역할
Next.js App Router 페이지, Server Action, Route Handler 템플릿 생성.

## 컨벤션
- TypeScript strict mode
- Tailwind CSS + shadcn/ui 컴포넌트
- 한국어 UI 텍스트
- 파일명: kebab-case
- 함수명: camelCase
- 타입/인터페이스: PascalCase

## 페이지 템플릿
- `page.tsx` — React Server Component (기본)
- `'use client'` — 인터랙티브 컴포넌트만
- `loading.tsx` — Suspense fallback
- `error.tsx` — 에러 바운더리

## Server Action 템플릿
- `actions.ts` — `'use server'` 선언
- FormData 입력 → 유효성 검증 → DB 조작 → revalidatePath

## Route Handler 템플릿
- `route.ts` — GET/POST/PATCH/DELETE
- NextRequest/NextResponse 사용
- 인증 확인 → 입력 검증 → 처리 → JSON 응답
