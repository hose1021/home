ALTER TABLE "payments" ADD COLUMN "period_year" integer DEFAULT 2026 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "period_month" integer DEFAULT 6 NOT NULL;
