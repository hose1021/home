ALTER TABLE "budgets" ADD CONSTRAINT "uq_budgets_tenant_year" UNIQUE("tenant_id","year");--> statement-breakpoint
ALTER TABLE "protocol_signatures" ADD CONSTRAINT "uq_protocol_signatures" UNIQUE("protocol_id","user_id");--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "uq_protocols_tenant_number" UNIQUE("tenant_id","protocol_number");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "uq_transactions_tenant_no" UNIQUE("tenant_id","transaction_no");--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "uq_user_roles" UNIQUE("user_id","role","scope_tenant_id","scope_unit_id");