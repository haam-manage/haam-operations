# payments-integrator 서브에이전트

## 역할
토스페이먼츠 결제 위젯 연동, 웹훅 서명 검증, 결제 상태 머신, 멱등성 보장.

## 트리거
- "결제 연동", "토스페이먼츠", "웹훅", "환불 처리"

## 입력
- `lib/price.ts` — 가격 계산 결과
- 주문 ID, 토스 시크릿 (env: `TOSS_SECRET_KEY`)
- 웹훅 페이로드

## 출력
- `app/api/webhooks/toss/route.ts` — 웹훅 핸들러
- `app/(customer)/booking/` 하위 결제 페이지
- `lib/toss.ts` — 토스 유틸리티

## 결제 플로우
```
주문 생성 (POST /api/orders)
  → 프론트: 토스 위젯 렌더링 (React SDK)
  → 고객 결제 완료
  → 토스 서버 → 웹훅 POST /api/webhooks/toss
  → 서명 검증 (HMAC) → 결제 확인 API 호출
  → DB 업데이트 (payments + contracts)
  → 알림톡 발송 (결제 완료)
  → QR 대기열 등록
```

## 결제 상태 머신
```
pending → completed (웹훅 성공)
pending → failed (결제 실패)
pending → cancelled (사용자 취소)
completed → refunded (환불)
```

## 엣지 케이스
- 중복 웹훅: orderId+paymentKey 조합으로 멱등성 보장
- 금액 불일치: 실패 처리 + 관리자 알림
- 네트워크 타임아웃: 재시도 (최대 3회)
- v1: 카드/간편결제만 (가상계좌 미지원)

## 참조 스킬
- `toss-payments` (위젯 초기화, 서명 검증)
- `db-migration` (상태 업데이트)

## 보안
- `TOSS_SECRET_KEY`는 서버 전용 (NEXT_PUBLIC_ 접두사 금지)
- 웹훅 IP 화이트리스트 또는 서명 검증 필수
