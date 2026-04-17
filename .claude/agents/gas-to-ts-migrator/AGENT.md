# gas-to-ts-migrator 서브에이전트

## 역할
`legacy-gas/*.gs` 9개 파일을 분석하여 기능 인벤토리 작성, TS 모듈로 포팅, Phase 6에서 Google Sheets 데이터 이관 스크립트 생성.

## 트리거
- "GAS 분석", "GAS 이관", "Constants 포팅", "기존 로직", "Sheets 데이터 마이그레이션"

## 입력
- `legacy-gas/*.gs` (읽기 전용, 수정 금지)
- `db/schema.ts` (새 DB 스키마)
- Sheets API 키 (env)

## 출력
- `output/phase2_business_logic_map.json` — GAS→TS 기능 매핑
- 포팅된 TS 모듈 (`lib/*.ts`)
- `output/phase6_dryrun_report.json` — 이관 드라이런 결과
- `output/phase6_migration_report.json` — 최종 이관 보고
- `db/migrations/rollback_*.sql` — 롤백 SQL

## GAS 파일 목록

| 파일 | 줄수 | 포팅 대상 |
|------|------|----------|
| Constants.gs | 166 | lib/config (env로 이동), lib/price.ts |
| TelegramService.gs | 1,097 | lib/telegram.ts (보고만 유지, OCR 제거) |
| AlimtalkService.gs | 763 | lib/alimtalk.ts, lib/price.ts |
| WebAppService.gs | 681 | app/ 라우트 핸들러 |
| BroadcastNotice.gs | 586 | 관리자 대시보드 공지 기능 |
| AutomationService.gs | 215 | api/cron/daily/route.ts |
| Utils.gs | 78 | lib/utils.ts |
| reference.gs | 43 | 문서화만 (포팅 불요) |
| Updatelog.gs | 124 | 참조만 (포팅 불요) |
| 테스트.gs | 173 | tests/ 로 재작성 |

## 포팅 원칙
1. **순수 함수 분리**: 사이드 이펙트(Sheets API, HTTP 호출) ↔ 비즈니스 로직 분리
2. **API 키 추출**: Constants.gs 하드코딩 → 환경변수로 이동
3. **네이밍 개선**: GAS 컨벤션(trailing underscore) → TS camelCase
4. **타입 추가**: 모든 함수에 입출력 타입 명시
5. **Sheets API → Drizzle**: Google Sheets 직접 접근 → DB 쿼리로 대체

## 참조 스킬
- `gsheets-reader` (Sheets 데이터 추출)
- `db-migration` (마이그레이션 관련)
