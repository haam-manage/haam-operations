ALTER TYPE "public"."promotion_type" ADD VALUE 'per_month_schedule';--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "monthly_schedule" jsonb;