# price-calculator 스킬

## 역할
HAAM 가격 로직 순수 함수. 프로모션 엔진 포함.

## 입력
- `cabinetSize`: M | L | XL
- `durationMonths`: 1~12
- `activePromotion`: 활성 프로모션 정보 (없으면 일반 할인)

## 출력
- `basePrice`: 월 정가
- `discountPercent`: 할인율
- `billableMonths`: 실결제 개월수
- `freeMonths`: 무료 개월수
- `monthlyPrice`: 할인 적용 월 단가
- `totalRental`: 총 렌탈료
- `deposit`: 보증금
- `totalAmount`: 총 결제금액 (렌탈료 + 보증금)

## 가격 정책
| 사이즈 | 월 정가 | 보증금 |
|--------|---------|--------|
| M | ₩70,000 | ₩70,000 |
| L | ₩120,000 | ₩120,000 |
| XL | ₩200,000 | ₩200,000 |

## 할인 규칙 (일반)
- 12개월+: 20%, 6~11개월: 15%, 3~5개월: 10%, 1~2개월: 0%

## 프로모션 (오픈기념)
- 1개월: 15% 할인, 3개월: 2개월결제+1무료, 6개월: 4+2, 12개월: 8+4

## 참조
- `legacy-gas/Constants.gs` — PRICING, DISCOUNT_TIERS, PROMOTION
- `legacy-gas/AlimtalkService.gs` — calculatePricing_(), calculatePromoPricing_()
