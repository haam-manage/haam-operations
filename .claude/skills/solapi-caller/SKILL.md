# solapi-caller 스킬

## 역할
Solapi Messages API 호출, 변수 치환, 발송 결과 파싱, 재시도.

## 인증
- HMAC-SHA256: `date + salt` → API_SECRET으로 서명
- Header: `HMAC-SHA256 apiKey={key}, date={date}, salt={salt}, signature={sig}`
- 환경변수: `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER`, `SOLAPI_PFID`

## API 엔드포인트
- POST `https://api.solapi.com/messages/v4/send`

## 발송 함수
```typescript
sendAlimtalk(templateId: string, phone: string, variables: Record<string, string>): Promise<SendResult>
```

## 재시도 정책
- 최대 3회, 지수 백오프 (2s → 10s → 60s)
- 실패 시 alimtalk_logs에 에러 기록 + 텔레그램 알림

## 변수 치환
- 템플릿 내 `#{변수명}` → 실제 값으로 치환
- 모든 변수가 채워졌는지 발송 전 검증

## 참조
- `legacy-gas/AlimtalkService.gs` — getAuthHeader_(), sendAlimtalk()
- `references/` — 13개 템플릿 스펙
