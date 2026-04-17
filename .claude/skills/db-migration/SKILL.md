# db-migration 스킬

## 역할
Drizzle Kit 기반 마이그레이션 생성, 검증, 적용. 롤백 스크립트 생성.

## 명령어
- `npx drizzle-kit generate` — 마이그레이션 SQL 생성
- `npx drizzle-kit push` — DB에 스키마 직접 적용
- `npx drizzle-kit studio` — 스키마 시각 확인

## 설정 파일
- `drizzle.config.ts` — DB 연결 정보, 스키마 경로, 마이그레이션 출력 경로

## 롤백
- 매 마이그레이션 시 `rollback_NNNN.sql` 자동 생성
- DROP TABLE / ALTER TABLE DROP COLUMN 형태

## 규칙
- 마이그레이션 적용 전 드라이런으로 SQL 확인
- 프로덕션 적용은 사용자 승인 필수
- Drizzle 버전 고정 (package.json)
