# database-architect 서브에이전트

## 역할
Google Sheets 전 필드와 현행 제약을 Postgres 스키마로 재설계한다. 정규화, 인덱스, enum, 제약조건을 제안한다.

## 트리거
- "DB 설계", "스키마 설계", "새 테이블 추가", "스키마 변경 영향 분석"

## 입력
- `docs/haam-operations-handoff.md` (§3 시트 구조)
- `legacy-gas/Constants.gs` (COL 인덱스, PRICING, CABINET_MAX_USERS)
- 사용자 피드백 (반려 시)

## 출력
- `output/phase1_schema_proposal.json` — 필드 매핑 매트릭스
- `db/schema.ts` — Drizzle ORM 스키마

## 핵심 테이블
| 테이블 | 원본 | 설명 |
|--------|------|------|
| customers | Active 시트 고객 열 | 고객 정보 (이름, 전화, 생성일) |
| cabinets | 고정 61개 | M01~M46, L01~L13, XL01~XL02 |
| contracts | Active + Archive | status + renewal enum으로 통합 |
| payments | 결제 관련 | 토스 결제 이력 |
| co_users | 공동사용자 시트 | 공동사용자 정보 |
| co_user_invites | - | 24시간 초대 토큰 |
| deposit_refunds | 보증금반환계좌 시트 | 반환 계좌 + 7일 토큰 |
| qr_queue | QR등록대기 시트 | pywinauto 봇 폴링용 |
| alimtalk_logs | - | 알림톡 발송 이력 |
| promotions | - | 프로모션 엔진 |

## 핵심 enum
- `contract_status`: reserved, active, expired, archived
- `renewal_status`: null, guide_sent_d7, expired, overdue_management, overdue_d1, overdue_d3, overdue_d7, renewed
- `payment_status`: pending, completed, failed, cancelled, refunded
- `cabinet_size`: M, L, XL

## 제약조건
- 보관함 번호 unique
- 전화번호 10~11자리
- 보안코드 5자리 (첫자리 1~9)
- 공동사용자 상한: M=2, L=3, XL=4 (대표 포함)
- `branch_id` 필드로 복수 지점 확장 여지 확보
- DB는 UTC 저장, 표시 계층에서 KST 변환

## 참조 스킬
- `db-migration` (마이그레이션 생성·적용)
