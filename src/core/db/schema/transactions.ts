import {integer, pgTable, text, timestamp, unique, uuid, varchar} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {users} from "./users";

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  transactionNo: varchar("transaction_no", { length: 50 }).notNull(),
  description: text("description").notNull(),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("posted").$type<"draft" | "posted" | "adjusted" | "reversed">(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  transactionNoUnique: unique("uq_transactions_tenant_no").on(table.tenantId, table.transactionNo),
}));
