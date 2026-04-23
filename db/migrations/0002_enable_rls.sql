-- Enable Row-Level Security on all public tables.
-- service_role / postgres superuser bypasses RLS, so Drizzle backend (DATABASE_URL)
-- keeps working. anon / authenticated roles (PostgREST public API) are denied
-- because no policies are defined.

ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cabinets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contracts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "co_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "co_user_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "deposit_refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qr_queue" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alimtalk_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "phone_otps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;
