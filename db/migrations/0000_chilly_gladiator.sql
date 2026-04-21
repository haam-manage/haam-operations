CREATE TYPE "public"."cabinet_size" AS ENUM('M', 'L', 'XL');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('reserved', 'active', 'expired', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."promotion_type" AS ENUM('discount_rate', 'free_months', 'fixed_discount');--> statement-breakpoint
CREATE TYPE "public"."qr_status" AS ENUM('pending', 'registered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."renewal_status" AS ENUM('guide_sent_d7', 'expired', 'overdue_management', 'overdue_d1', 'overdue_d3', 'overdue_d7', 'renewed');--> statement-breakpoint
CREATE TABLE "alimtalk_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid,
	"template_id" varchar(50) NOT NULL,
	"template_name" varchar(50) NOT NULL,
	"recipient_phone" varchar(20) NOT NULL,
	"variables" jsonb,
	"success" boolean NOT NULL,
	"result_id" varchar(100),
	"error_message" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"phone" varchar(20) NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cabinets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" varchar(10) NOT NULL,
	"size" "cabinet_size" NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"branch_id" varchar(20) DEFAULT 'sungsil' NOT NULL,
	CONSTRAINT "cabinets_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "co_user_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "co_user_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "co_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"security_code" varchar(5) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"cabinet_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"months" integer NOT NULL,
	"expiry_date" date NOT NULL,
	"status" "contract_status" DEFAULT 'reserved' NOT NULL,
	"renewal" "renewal_status",
	"rental_amount" integer NOT NULL,
	"deposit_amount" integer NOT NULL,
	"security_code" varchar(5) NOT NULL,
	"my_page_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"remark" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "security_code_check" CHECK (length("contracts"."security_code") = 5 AND left("contracts"."security_code", 1) != '0')
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(100),
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposit_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"bank_name" varchar(50),
	"account_number" varchar(50),
	"account_holder" varchar(50),
	"is_registered" boolean DEFAULT false NOT NULL,
	"is_refunded" boolean DEFAULT false NOT NULL,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deposit_refunds_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"order_id" varchar(100) NOT NULL,
	"payment_key" varchar(200),
	"amount" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"method" varchar(50),
	"receipt_url" text,
	"fail_reason" text,
	"webhook_received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "phone_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code" varchar(6) NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "promotion_type" NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"applicable_sizes" jsonb,
	"applicable_months" jsonb,
	"is_new_only" boolean DEFAULT false NOT NULL,
	"discount_rate" numeric(5, 4),
	"free_months" integer,
	"discount_amount" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"cabinet_number" varchar(10) NOT NULL,
	"security_code" varchar(5) NOT NULL,
	"user_name" varchar(50) NOT NULL,
	"user_type" varchar(10) DEFAULT 'primary' NOT NULL,
	"status" "qr_status" DEFAULT 'pending' NOT NULL,
	"registered_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alimtalk_logs" ADD CONSTRAINT "alimtalk_logs_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_user_invites" ADD CONSTRAINT "co_user_invites_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_users" ADD CONSTRAINT "co_users_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_cabinet_id_cabinets_id_fk" FOREIGN KEY ("cabinet_id") REFERENCES "public"."cabinets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_refunds" ADD CONSTRAINT "deposit_refunds_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_queue" ADD CONSTRAINT "qr_queue_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alimtalk_logs_contract_idx" ON "alimtalk_logs" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "alimtalk_logs_sent_at_idx" ON "alimtalk_logs" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "alimtalk_logs_template_date_idx" ON "alimtalk_logs" USING btree ("contract_id","template_name","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_idx" ON "auth_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "cabinets_size_available_idx" ON "cabinets" USING btree ("size","is_available");--> statement-breakpoint
CREATE INDEX "co_user_invites_token_idx" ON "co_user_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "co_users_contract_idx" ON "co_users" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "contracts_customer_idx" ON "contracts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "contracts_cabinet_idx" ON "contracts" USING btree ("cabinet_id");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contracts_expiry_idx" ON "contracts" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "contracts_my_page_token_idx" ON "contracts" USING btree ("my_page_token");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "deposit_refunds_token_idx" ON "deposit_refunds" USING btree ("token");--> statement-breakpoint
CREATE INDEX "deposit_refunds_contract_idx" ON "deposit_refunds" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "payments_contract_idx" ON "payments" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "phone_otps_phone_idx" ON "phone_otps" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "qr_queue_status_idx" ON "qr_queue" USING btree ("status");