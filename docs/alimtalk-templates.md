# HAAM 알림톡 템플릿 매핑표

> Solapi 등록 템플릿 기준. 변수는 `#{변수명}` 형식.

## 등록 완료 템플릿 (10개)

| # | ID | 템플릿 코드 | 이벤트 | 주요 변수 |
|---|-----|------------|--------|----------|
| 1 | VISIT_CONFIRM | KA01TP260319083213962X1nqM6ujxhP | 방문 예약 확정 | 고객명, 방문일시 |
| 2 | CONTRACT_RESERVATION | KA01TP260222235233515FtWm3CNVkwp | 보관함 예약 확정 + 결제 요청 | 고객명, 보관함번호, 사이즈, 기간, 금액, 결제링크 |
| 3 | CONTRACT_PAYMENT | KA01TP260223005507374rBSS64NruUq | 결제 완료 + QR 등록 안내 | 고객명, 보관함번호, 보안코드, 시작일, 만료일 |
| 4 | CONTRACT_MONTH_CHANGE | KA01TP260309141600667NsORhxn4bZU | 개월변경 확정 | 고객명, 보관함번호, 변경전/후 기간, 금액 |
| 5 | CO_USER_REGISTER | KA01TP260316154204906cKwlP2Ej2ib | 공동사용자 QR 등록 안내 | 공동사용자명, 보관함번호, 보안코드 |
| 6 | CO_USER_INVITE | KA01TP260320011320285dBxZ1N7OjIw | 공동사용자 초대 링크 | 대표자명, 보관함번호, 초대링크 |
| 7 | CO_USER_CONFIRM | KA01TP260320011655252MdTQq4X5mIK | 대표자에게 등록 확인 알림 | 대표자명, 공동사용자명, 보관함번호 |
| 8 | CABINET_ERROR | KA01TP260326060335391Egsp7T9gUuA | 보관함번호 확인 요청 | 고객명, 보관함번호 |
| 9 | EXPIRY_D7 | KA01TP2602230804393738zbazmzrEba | 만료 D-7 안내 | 고객명, 보관함번호, 만료일, 재계약링크 |
| 10 | EXPIRY_D0 | KA01TP260326100350885RD4ZXEUYLeg | 만료 당일 + 보증금 반환 | 고객명, 보관함번호, 반환계좌등록링크 |

## 미등록 템플릿 (3개, Solapi 심사 필요)

| # | ID | 이벤트 | 주요 변수 |
|---|-----|--------|----------|
| 11 | OVERDUE_D1 | 연체 D+1 경고 | 고객명, 보관함번호, 연체일수, 연락처 |
| 12 | OVERDUE_D3 | 연체 D+3 경고 | 고객명, 보관함번호, 연체일수 |
| 13 | OVERDUE_D7 | 연체 D+7 최종 경고 | 고객명, 보관함번호, 연체일수 |

## 이벤트 → 템플릿 매핑

| 이벤트 | 템플릿 | 수신자 | 발송 시점 |
|--------|--------|--------|----------|
| 방문 예약 생성 | VISIT_CONFIRM | 고객 | 즉시 |
| 계약 예약 생성 | CONTRACT_RESERVATION | 고객 | 즉시 |
| 결제 완료 (웹훅) | CONTRACT_PAYMENT | 고객 | 웹훅 수신 즉시 |
| 개월 변경 | CONTRACT_MONTH_CHANGE | 고객 | 즉시 |
| 공동사용자 QR 등록 | CO_USER_REGISTER | 공동사용자 | QR 등록 완료 시 |
| 공동사용자 초대 | CO_USER_INVITE | 공동사용자 후보 | 대표자 요청 시 |
| 공동사용자 등록 완료 | CO_USER_CONFIRM | 대표자 | 등록 완료 시 |
| 보관함번호 오류 | CABINET_ERROR | 고객 | 감지 시 |
| 만료 D-7 | EXPIRY_D7 | 고객 | 일일 배치 09:00 |
| 만료 D-0 | EXPIRY_D0 | 고객 | 일일 배치 09:00 |
| 연체 D+1 | OVERDUE_D1 | 고객 | 일일 배치 09:00 |
| 연체 D+3 | OVERDUE_D3 | 고객 | 일일 배치 09:00 |
| 연체 D+7 | OVERDUE_D7 | 고객 | 일일 배치 09:00 |

## Solapi 인증
- HMAC-SHA256: `date + salt` → API_SECRET 서명
- Header: `HMAC-SHA256 apiKey={key}, date={date}, salt={salt}, signature={sig}`
- 발신 번호: 환경변수 `SOLAPI_SENDER_NUMBER`
