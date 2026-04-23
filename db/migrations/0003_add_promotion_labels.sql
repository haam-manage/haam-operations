-- Promotions 테이블에 고객 노출용 라벨 2개 추가.
--   banner_label : Step 1 상단 배너 문구 (예: "봄맞이 특별 할인") — 비우면 name 사용
--   badge_label  : 사이즈 카드 뱃지 문구 (예: "첫 달 반값")      — 비우면 자동 생성

ALTER TABLE "promotions" ADD COLUMN "banner_label" varchar(100);--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "badge_label" varchar(50);
