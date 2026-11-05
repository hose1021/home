CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text NOT NULL,
	"expense_date" date NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "tariff_per_sqm" numeric(12, 2) DEFAULT '0.40' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_start" varchar(7) DEFAULT '2025-01' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "due_day" integer DEFAULT 15 NOT NULL;--> statement-breakpoint

-- Collapse service-based charge lines into one apartment charge per period.
CREATE TEMP TABLE "charge_merge" AS
SELECT tenant_id, unit_id, period_year, period_month,
       (array_agg(id ORDER BY created_at, id))[1] AS keep_id,
       sum(amount) AS total_amount
FROM "charges"
GROUP BY tenant_id, unit_id, period_year, period_month;--> statement-breakpoint

CREATE TEMP TABLE "charge_map" AS
SELECT c.id, m.keep_id
FROM "charges" c
JOIN "charge_merge" m USING (tenant_id, unit_id, period_year, period_month);--> statement-breakpoint

CREATE TEMP TABLE "allocation_merge" AS
SELECT pa.payment_id, m.keep_id AS charge_id, sum(pa.amount) AS amount
FROM "payment_allocations" pa
JOIN "charge_map" m ON m.id = pa.charge_id
GROUP BY pa.payment_id, m.keep_id;--> statement-breakpoint

ALTER TABLE "payments" DISABLE TRIGGER USER;--> statement-breakpoint

UPDATE "payments" p SET charge_id = m.keep_id
FROM "charge_map" m
WHERE p.charge_id = m.id AND m.id <> m.keep_id;--> statement-breakpoint

ALTER TABLE "payments" ENABLE TRIGGER USER;--> statement-breakpoint

UPDATE "adjustments" a SET charge_id = m.keep_id
FROM "charge_map" m
WHERE a.charge_id = m.id AND m.id <> m.keep_id;--> statement-breakpoint

DELETE FROM "payment_allocations";--> statement-breakpoint

INSERT INTO "payment_allocations" ("tenant_id", "payment_id", "charge_id", "amount")
SELECT p.tenant_id, am.payment_id, am.charge_id, am.amount
FROM "allocation_merge" am
JOIN "payments" p ON p.id = am.payment_id;--> statement-breakpoint

INSERT INTO "payment_allocations" ("tenant_id", "payment_id", "charge_id", "amount")
SELECT p.tenant_id, p.id, p.charge_id, p.amount
FROM "payments" p
WHERE p.charge_id IS NOT NULL
  AND p.status = 'confirmed'
  AND NOT EXISTS (SELECT 1 FROM "payment_allocations" pa WHERE pa.payment_id = p.id);--> statement-breakpoint

DELETE FROM "charges" c
USING "charge_map" m
WHERE c.id = m.id AND m.id <> m.keep_id;--> statement-breakpoint

UPDATE "charges" c SET amount = m.total_amount
FROM "charge_merge" m
WHERE c.id = m.keep_id;--> statement-breakpoint

UPDATE "charges" c SET status = x.status
FROM (
  SELECT c.id,
    CASE
      WHEN coalesce(sum(pa.amount), 0) >= c.amount THEN 'paid'
      WHEN coalesce(sum(pa.amount), 0) > 0 THEN 'partially_paid'
      WHEN c.status = 'cancelled' THEN 'cancelled'
      WHEN c.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END AS status
  FROM "charges" c
  LEFT JOIN "payment_allocations" pa ON pa.charge_id = c.id
  GROUP BY c.id
) x
WHERE c.id = x.id;--> statement-breakpoint

DROP TABLE "budget_items" CASCADE;--> statement-breakpoint
DROP TABLE "budgets" CASCADE;--> statement-breakpoint
DROP TABLE "charge_templates" CASCADE;--> statement-breakpoint
DROP TABLE "fund_transactions" CASCADE;--> statement-breakpoint
DROP TABLE "funds" CASCADE;--> statement-breakpoint
DROP TABLE "journal_entries" CASCADE;--> statement-breakpoint
ALTER TABLE "charges" DROP CONSTRAINT IF EXISTS "uq_charges_tenant_template_unit_period";--> statement-breakpoint
ALTER TABLE "charges" DROP CONSTRAINT IF EXISTS "charges_template_id_charge_templates_id_fk";--> statement-breakpoint
ALTER TABLE "charges" DROP COLUMN IF EXISTS "template_id";--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "uq_charges_tenant_unit_period" UNIQUE("tenant_id","unit_id","period_year","period_month");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_expenses_tenant_date" ON "expenses" USING btree ("tenant_id","expense_date");
