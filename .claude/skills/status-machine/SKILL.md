# status-machine 스킬

## 역할
RENEWAL 상태 전이를 결정론적으로 관리. 일일 배치·수동 상태 변경·재계약 처리에 사용.

## 상태 전이표

### 만료 플로우
```
null (활성) → guide_sent_d7 (D-7 알림 발송)
guide_sent_d7 → expired (D-0 만료 처리)
expired → archived (D+3 아카이빙)
```

### 연체 플로우
```
overdue_management → overdue_d1 (D+1)
overdue_d1 → overdue_d3 (D+3)
overdue_d3 → overdue_d7 (D+7)
```

### 특수 상태
- `renewed`: 재계약 완료. D-7/D-0 알림 스킵
- 재계약 시: renewal → renewed, 새 만료일 설정

## 알림톡 트리거
| 전이 | 템플릿 |
|------|--------|
| null → guide_sent_d7 | EXPIRY_D7 |
| guide_sent_d7 → expired | EXPIRY_D0 |
| → overdue_d1 | OVERDUE_D1 |
| → overdue_d3 | OVERDUE_D3 |
| → overdue_d7 | OVERDUE_D7 |

## 멱등성 가드
- 같은 날짜에 같은 계약에 대해 동일 전이 중복 실행 방지
- alimtalk_logs 테이블에서 발송 이력 확인

## 참조
- `legacy-gas/AutomationService.gs` — 일일 자동화 로직
