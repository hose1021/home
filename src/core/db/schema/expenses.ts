import {date, decimal, index, text, timestamp, uuid} from "drizzle-orm/pg-core";
import {pgTable} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {users} from "./users";

/** A payment the building makes for a house service: security, lift, cleaning, repairs. */
export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  expenseDate: date("expense_date").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantDateIdx: index("ix_expenses_tenant_date").on(table.tenantId, table.expenseDate),
}));
