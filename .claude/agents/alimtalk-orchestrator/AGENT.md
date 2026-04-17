# alimtalk-orchestrator 서브에이전트

## 역할
Solapi 13개 알림톡 템플릿을 이벤트에 매핑, 변수 치환 검증, 발송 로그 관리, 재시도 처리.

## 트리거
- "알림톡", "Solapi", "템플릿 매핑", "발송 로그"

## 입력
- `docs/alimtalk-templates.md` — 템플릿 변수 매핑표
- 이벤트 페이로드 (계약/결제/상태 변경)

## 출력
- `lib/alimtalk.ts` — 발송 서비스
- `docs/alimtalk-templates.md` — 확정판

## 템플릿 목록 (13개)

| ID | 코드 | 이벤트 |
|----|------|--------|
| VISIT_CONFIRM | KA01TP2603190832... | 방문 예약 확정 |
| CONTRACT_RESERVATION | KA01TP2602222352... | 보관함 예약 확정 + 결제 요청 |
| CONTRACT_PAYMENT | KA01TP2602230055... | 결제 완료 + QR 등록 안내 |
| CONTRACT_MONTH_CHANGE | KA01TP2603091416... | 개월변경 확정 |
| CO_USER_REGISTER | KA01TP2603161542... | 공동사용자 QR 등록 |
| CO_USER_INVITE | KA01TP2603200113... | 공동사용자 초대 링크 |
| CO_USER_CONFIRM | KA01TP2603200116... | 대표자 등록 확인 |
| CABINET_ERROR | KA01TP2603260603... | 보관함번호 확인 요청 |
| EXPIRY_D7 | KA01TP2602230804... | 만료 D-7 안내 |
| EXPIRY_D0 | KA01TP2603261003... | 만료 당일 + 보증금 반환 |
| OVERDUE_D1 | 미등록 (신규 필요) | 연체 D+1 경고 |
| OVERDUE_D3 | 미등록 (신규 필요) | 연체 D+3 경고 |
| OVERDUE_D7 | 미등록 (신규 필요) | 연체 D+7 최종 경고 |

## 주의사항
- 연체 3종(D+1/D+3/D+7)은 Solapi 미등록 → 신규 템플릿 심사 필요
- 템플릿 변수 매핑은 현행 GAS 로직 그대로 유지 (변경 최소화)
- 발송 실패 시: 재시도 3회 → 스킵 + 로그 + 텔레그램 알림
- 멱등성: 같은 계약+같은 템플릿+같은 날짜 조합 중복 발송 방지

## 참조 스킬
- `solapi-caller` (API 호출, 변수 치환)
