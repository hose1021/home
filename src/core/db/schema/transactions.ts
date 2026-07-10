import {decimal, integer, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {users} from "./users";
import {funds} from "./funds";

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
  transactionNoUnique: { columns: [table.tenantId, table.transactionNo], name: "uq_transactions_tenant_no" },
}));

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id),
  accountCode: varchar("account_code", { length: 10 }).notNull(),
  fundId: uuid("fund_id").references(() => funds.id),
  debit: decimal("debit", { precision: 12, scale: 2 }).notNull().default("0"),
  credit: decimal("credit", { precision: 12, scale: 2 }).notNull().default("0"),
  description: text("description"),
});
