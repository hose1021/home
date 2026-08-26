ALTER TABLE "contractors" ADD CONSTRAINT "uq_contractors_tenant_id" UNIQUE("tenant_id","id");--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "uq_meetings_tenant_id" UNIQUE("tenant_id","id");--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "uq_tickets_tenant_id" UNIQUE("tenant_id","id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "uq_users_tenant_id" UNIQUE("tenant_id","id");--> statement-breakpoint
ALTER TABLE "management_members" ADD CONSTRAINT "fk_management_members_tenant_owner" FOREIGN KEY ("tenant_id","owner_id") REFERENCES "public"."owners"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_tenant_user" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "fk_protocols_tenant_meeting" FOREIGN KEY ("tenant_id","meeting_id") REFERENCES "public"."meetings"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residents" ADD CONSTRAINT "fk_residents_tenant_unit" FOREIGN KEY ("tenant_id","unit_id") REFERENCES "public"."units"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "fk_work_orders_tenant_ticket" FOREIGN KEY ("tenant_id","ticket_id") REFERENCES "public"."tickets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "fk_work_orders_tenant_contractor" FOREIGN KEY ("tenant_id","contractor_id") REFERENCES "public"."contractors"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
