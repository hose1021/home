import { pgTable, uuid, varchar, text, timestamp, decimal, integer } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { charges } from "./charges";
import { units } from "./units";
import { owners } from "./owners";
import { users } from "./users";
import { transactions } from "./transactions";

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  chargeId: uuid("charge_id").references(() => charges.id),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  ownerId: uuid("owner_id").notNull().references(() => owners.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull(),
  paymentMethod: varchar("payment_method", { length: 30 }).notNull().$type<"cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal" | "other">(),
  referenceNo: varchar("reference_no", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<"pending" | "confirmed" | "rejected" | "refunded">(),
  confirmedBy: uuid("confirmed_by").references(() => users.id),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
