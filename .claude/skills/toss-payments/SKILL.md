# toss-payments 스킬

## 역할
토스페이먼츠 결제 위젯 초기화, 결제 요청 생성, 웹훅 서명 검증, 결제 확인 API 호출.

## 환경변수
- `NEXT_PUBLIC_TOSS_CLIENT_KEY` — 프론트엔드 위젯용
- `TOSS_SECRET_KEY` — 서버 전용 (웹훅 검증, 결제 확인)

## 결제 위젯 (프론트)
- React SDK: `@toss/payment-widget-sdk`
- 초기화: `loadPaymentWidget(clientKey, customerKey)`
- 결제 요청: `paymentWidget.requestPayment({ orderId, orderName, amount })`

## 결제 확인 API (서버)
- POST `https://api.tosspayments.com/v1/payments/confirm`
- Header: `Authorization: Basic {base64(secretKey:)}`
- Body: `{ paymentKey, orderId, amount }`

## 웹훅 서명 검증
- Header: `TossPayments-Signature`
- 검증: HMAC-SHA256 (webhook secret + body)

## v1 제한
- 카드 결제 + 간편결제만 지원
- 가상계좌(계좌이체)는 v1.1

## 참조
- 토스 API 문서 (v2025-05-01)
