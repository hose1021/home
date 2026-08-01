CREATE UNIQUE INDEX IF NOT EXISTS "uq_owners_tenant_id" ON "owners" ("tenant_id", "id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_units_tenant_id" ON "units" ("tenant_id", "id");--> statement-breakpoint
ALTER TABLE "ownerships" ADD CONSTRAINT "fk_ownerships_tenant_owner" FOREIGN KEY ("tenant_id", "owner_id") REFERENCES "owners" ("tenant_id", "id");--> statement-breakpoint
ALTER TABLE "ownerships" ADD CONSTRAINT "fk_ownerships_tenant_unit" FOREIGN KEY ("tenant_id", "unit_id") REFERENCES "units" ("tenant_id", "id");--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "uq_charges_tenant_template_unit_period" UNIQUE ("tenant_id", "template_id", "unit_id", "period_year", "period_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_tenant_date" ON "payments" ("tenant_id", "payment_date" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_charges_tenant_period" ON "charges" ("tenant_id", "period_year", "period_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tickets_tenant_status" ON "tickets" ("tenant_id", "status", "created_at" DESC);--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_confirmed_payment_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    RAISE EXCEPTION 'Confirmed payments are immutable';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND (
    NEW.amount IS DISTINCT FROM OLD.amount OR
    NEW.charge_id IS DISTINCT FROM OLD.charge_id OR
    NEW.unit_id IS DISTINCT FROM OLD.unit_id OR
    NEW.owner_id IS DISTINCT FROM OLD.owner_id OR
    NEW.period_year IS DISTINCT FROM OLD.period_year OR
    NEW.period_month IS DISTINCT FROM OLD.period_month OR
    NEW.payment_method IS DISTINCT FROM OLD.payment_method OR
    NEW.reference_no IS DISTINCT FROM OLD.reference_no OR
    NEW.tariff_per_sqm IS DISTINCT FROM OLD.tariff_per_sqm OR
    NEW.notes IS DISTINCT FROM OLD.notes
  ) THEN
    RAISE EXCEPTION 'Confirmed payment fields are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS payments_immutable_confirmed ON "payments";--> statement-breakpoint
CREATE TRIGGER payments_immutable_confirmed BEFORE UPDATE OR DELETE ON "payments" FOR EACH ROW EXECUTE FUNCTION prevent_confirmed_payment_mutation();
