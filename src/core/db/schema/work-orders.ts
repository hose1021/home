import {decimal, foreignKey, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {contractors} from "./contractors";
import {tenants} from "./tenants";
import {tickets} from "./tickets";
import {users} from "./users";

export const workOrders = pgTable("work_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  ticketId: uuid("ticket_id").references(() => tickets.id),
  contractorId: uuid("contractor_id").references(() => contractors.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<"pending" | "approved" | "in_progress" | "completed" | "cancelled">(),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
  completedDate: timestamp("completed_date", { withTimezone: true }),
  invoiceUrl: text("invoice_url"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantTicketForeignKey: foreignKey({
    columns: [table.tenantId, table.ticketId],
    foreignColumns: [tickets.tenantId, tickets.id],
    name: "fk_work_orders_tenant_ticket",
  }),
  tenantContractorForeignKey: foreignKey({
    columns: [table.tenantId, table.contractorId],
    foreignColumns: [contractors.tenantId, contractors.id],
    name: "fk_work_orders_tenant_contractor",
  }),
}));
