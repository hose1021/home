CREATE UNIQUE INDEX IF NOT EXISTS "uq_charges_tenant_id" ON "charges" ("tenant_id", "id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_payments_tenant_id" ON "payments" ("tenant_id", "id");--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "fk_charges_tenant_unit" FOREIGN KEY ("tenant_id", "unit_id") REFERENCES "units" ("tenant_id", "id");--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "fk_charges_tenant_owner" FOREIGN KEY ("tenant_id", "owner_id") REFERENCES "owners" ("tenant_id", "id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_tenant_unit" FOREIGN KEY ("tenant_id", "unit_id") REFERENCES "units" ("tenant_id", "id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_tenant_owner" FOREIGN KEY ("tenant_id", "owner_id") REFERENCES "owners" ("tenant_id", "id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_tenant_charge" FOREIGN KEY ("tenant_id", "charge_id") REFERENCES "charges" ("tenant_id", "id");
