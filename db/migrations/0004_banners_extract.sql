-- 배너를 프로모션에서 분리.
--   - 새 테이블 banners : 시즌·캠페인 문구를 독립적으로 관리. 활성 1건의 priority 최상위가 Step 1 상단 노출.
--   - promotions.banner_label 컬럼 제거 (0003 에서 추가했던 것). 뱃지는 promotions.badge_label 에 남김.
-- NOTE: 기존 promotions.banner_label 에 들어있던 문구는 수동 이관 필요. 데이터가 있으면 먼저 banners 에 복사 후 이 마이그레이션 실행 권장.

CREATE TABLE "banners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "label" varchar(100) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "promotions" DROP COLUMN IF EXISTS "banner_label";
