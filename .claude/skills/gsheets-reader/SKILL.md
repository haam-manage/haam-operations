# gsheets-reader 스킬

## 역할
Google Sheets API로 HAAM 시트 데이터를 추출하여 JSON/CSV 형식으로 변환.

## 대상 시트
| 시트명 | 예상 건수 | 용도 |
|--------|----------|------|
| Active | ~20건 | 현재 계약 |
| Archive | ~50건 | 종료 계약 |
| 공동사용자 | ~10건 | 공동사용자 |
| 보증금반환계좌 | ~30건 | 반환 이력 |

## 환경변수
- `GOOGLE_SHEETS_ID` — 스프레드시트 ID
- `GOOGLE_SERVICE_ACCOUNT_KEY` — 서비스 계정 JSON

## 검증
- 전화번호: 10~11자리 숫자
- 날짜: YYYY-MM-DD 형식
- 보관함 번호: M01~M46, L01~L13, XL01~XL02
- 이상값 발견 시 `anomalies` 배열에 기록

## 출력
- `output/phase6_sheets_export.json`
