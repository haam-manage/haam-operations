@AGENTS.md

# HAAM 운영시스템 재구축 — 메인 오케스트레이터

## 1. 프로젝트 개요

HAAM(도심창고:함) 숭실대입구점의 운영 시스템을 GAS+Google Sheets에서 Next.js+Supabase+Vercel로 전환한다.
- **고객용**: 모바일 퍼스트 예약/결제/마이페이지 (haam.co.kr)
- **관리자용**: 대시보드 (계약현황/매출/만료/프로모션 관리)
- **자동화**: 만료·연체·QR 등록 배치

## 2. 절대 변경 금지 규칙

아래는 현행 비즈니스 규칙이며 코드 구현 시 반드시 준수한다. 변경이 필요하면 사용자 승인 필수.

### 가격 정책
| 사이즈 | 월 정가 | 보증금 | 최대 이용자 |
|--------|---------|--------|------------|
| M (소중:함) | ₩70,000 | ₩70,000 | 2명 |
| L (든든:함) | ₩120,000 | ₩120,000 | 3명 |
| XL (넉넉:함) | ₩200,000 | ₩200,000 | 4명 |

### 장기 할인 (프로모션 비활성 시)
| 기간 | 할인율 |
|------|--------|
| 12개월+ | 20% |
| 6~11개월 | 15% |
| 3~5개월 | 10% |
| 1~2개월 | 0% |

### 오픈기념 프로모션 (활성 시, 장기할인 대체)
| 계약 | 실결제 | 무료 |
|------|--------|------|
| 1개월 | 1개월(15%할인) | 0 |
| 3개월 | 2개월 | 1개월 |
| 6개월 | 4개월 | 2개월 |
| 12개월 | 8개월 | 4개월 |

### 만료 타임라인
- D-7: 만료 예고 알림톡 (RENEWAL='재계약'이면 스킵)
- D-0: 만료 처리 + 보증금 반환 토큰 발급
- D+3: 아카이빙

### 연체 에스컬레이션
- D+1 / D+3 / D+7: 단계별 알림톡

### 보증금
- 계약 시 1회 수납, 종료 후 3일 내 반환

### 보안코드
- 5자리 숫자, 첫 자리 1~9

### 공동사용자 상한
- M: 2명, L: 3명, XL: 4명 (대표자 포함)

## 3. 진행 상태 추적

- Phase 시작: `output/phase-{n}/start.json`
- Phase 완료: `output/phase-{n}/complete.json`
- 세션 시작 시 `output/phase-*/complete.json`을 확인해 현재 Phase 판단
- 중단 시 가장 최신 start.json 있고 complete.json 없는 Phase부터 재개

## 4. Phase별 체크리스트

### Phase 0: 프로젝트 준비 ✅ (진행 중)
- [x] 스택 확정: Next.js 16 + Supabase + Vercel + Drizzle ORM
- [x] 의존성 설치
- [x] 프로젝트 구조 생성
- [ ] CLAUDE.md + AGENT.md + SKILL.md 작성
- [ ] 핵심 문서 작성 (architecture, business-rules, alimtalk-templates)
- [ ] .env.example + 환경변수 수집
- [ ] health 엔드포인트 생성

### Phase 1: 도메인 모델
- [ ] Drizzle 스키마 설계 (db/schema.ts)
- [ ] 사용자 스키마 리뷰 [인간 승인]
- [ ] 마이그레이션 생성·적용

### Phase 2: 비즈니스 로직 이관
- [ ] GAS 분석 → 기능 인벤토리
- [ ] lib/price.ts (가격 계산 + 13 테스트)
- [ ] lib/status.ts (상태 머신 + 7 테스트)
- [ ] lib/validation.ts (검증 규칙 + 20 테스트)

### Phase 3: 외부 서비스 연동
- [ ] 토스페이먼츠 결제 위젯 + 웹훅
- [ ] Solapi 알림톡 13템플릿
- [ ] QR 큐 인터페이스
- [ ] 텔레그램 보고 채널

### Phase 4: UI 구현
- [ ] 고객 예약/결제 (SVG 보관함 선택 포함)
- [ ] 고객 마이페이지 (토큰 URL)
- [ ] 관리자 대시보드

### Phase 5: 자동화 배치
- [ ] 일일 배치 (D-7/D-0/D+1/D+3/D+7)
- [ ] 미납 정리, 아카이빙, 토큰 만료

### Phase 6: 마이그레이션 + 배포
- [ ] Sheets 데이터 추출
- [ ] 드라이런 + 실이관 [인간 승인]
- [ ] 스테이징 QA
- [ ] 프로덕션 배포 [인간 승인]

## 5. 서브에이전트 호출 규칙

| 에이전트 | 트리거 키워드 | 데이터 전달 |
|---------|-------------|-----------|
| database-architect | DB 설계, 스키마, 테이블 추가 | output/phase1_* |
| payments-integrator | 결제, 토스, 웹훅, 환불 | lib/toss.ts, DB |
| alimtalk-orchestrator | 알림톡, Solapi, 템플릿 | lib/alimtalk.ts, DB |
| gas-to-ts-migrator | GAS 분석, 이관, Sheets 마이그레이션 | legacy-gas/*, output/phase2_*, output/phase6_* |

- 서브에이전트 간 직접 호출 금지. 메인이 output/ 파일로 릴레이
- 서브에이전트 호출 전 입력 파일 존재 확인

## 6. 스킬 사용 규칙

| 스킬 | 용도 |
|------|------|
| solapi-caller | 알림톡 발송 (변수 치환 + 재시도) |
| toss-payments | 결제 위젯 초기화 + 웹훅 검증 |
| price-calculator | 가격 계산 순수 함수 |
| status-machine | RENEWAL 상태 전이 |
| gsheets-reader | Google Sheets 데이터 추출 |
| db-migration | Drizzle 마이그레이션 생성·적용 |
| next-scaffold | 페이지/API 라우트 스캐폴드 |

## 7. 인간 개입 포인트 (5회)

1. **Phase 0.1**: 기술 스택 확정 → ✅ 완료
2. **Phase 0.3**: 환경변수 값 입력
3. **Phase 1.2**: DB 스키마 확정 승인
4. **Phase 6.2**: 실 데이터 마이그레이션 승인
5. **Phase 6.4**: 프로덕션 배포 승인

## 8. 실패/에스컬레이션 정책

| 유형 | 대응 | 최대 재시도 |
|------|------|-----------|
| 일시적 오류 (네트워크/레이트리밋) | 자동 재시도 (지수 백오프) | 3 |
| 형식 오류 (JSON/코드 스키마 불일치) | 자동 재시도 (피드백 포함) | 2 |
| 스펙 모호 (GAS 의도 불명확) | 에스컬레이션 (사용자 질의) | 0 |
| 검증 실패 (필수 단계) | 즉시 중단 + 롤백 + 에스컬레이션 | 0 |
| 보안 위반 (시크릿 노출) | 즉시 중단 + 수정 | 0 |

로그: `output/logs/agent.log.jsonl` (append-only JSONL)

## 9. 네이밍/코드 스타일 규약

- TypeScript strict mode
- Drizzle ORM (raw SQL 최소화)
- Tailwind CSS + shadcn/ui 컴포넌트
- 파일: kebab-case, 함수/변수: camelCase, 타입/인터페이스: PascalCase
- DB 컬럼: snake_case
- KST 타임존: DB는 UTC 저장, 표시 계층에서 KST 변환

## 10. 환경변수·시크릿 관리

- `.env.local`은 절대 커밋 금지 (.gitignore에 포함)
- `.env.example`에 플레이스홀더만 기록
- 프로덕션: Vercel 환경변수로 관리
- `NEXT_PUBLIC_*` 접두사 = 프론트엔드 노출 허용

## 11. 테스트·배포 규약

- 단위 테스트: Vitest (`pnpm test`)
- E2E 테스트: Playwright (`pnpm test:e2e`)
- 타입체크: `pnpm tsc --noEmit`
- 배포: Vercel (main 브랜치 → 프로덕션, PR → Preview)
- main 브랜치 보호: 테스트 통과 필수

## 12. 참조 우선순위

1. `docs/haam-operations-handoff.md` (비즈니스 규칙 원본)
2. `legacy-gas/*.gs` (기존 로직 참조)
3. 추론 (1, 2에 없는 경우)

변경 금지 파일: `legacy-gas/*.gs` (읽기 전용), `docs/haam-operations-handoff.md`
