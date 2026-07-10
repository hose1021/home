import {decimal, integer, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {users} from "./users";

export const budgets = pgTable("budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  year: integer("year").notNull(),
  status: varchar("status", { length: 20 }).default("draft").$type<"draft" | "pending_approval" | "approved" | "rejected">(),
  totalIncome: decimal("total_income", { precision: 12, scale: 2 }).notNull().default("0"),
  totalExpense: decimal("total_expense", { precision: 12, scale: 2 }).notNull().default("0"),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantYearUnique: { columns: [table.tenantId, table.year], name: "uq_budgets_tenant_year" },
}));

export const budgetItems = pgTable("budget_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  budgetId: uuid("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  accountCode: varchar("account_code", { length: 10 }).notNull(),
  plannedAmount: decimal("planned_amount", { precision: 12, scale: 2 }).notNull(),
  actualAmount: decimal("actual_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
});
