import {date, decimal, integer, pgTable, timestamp, unique, uuid, varchar} from "drizzle-orm/pg-core";
import {owners} from "./owners";
import {tenants} from "./tenants";
import {units} from "./units";
import {users} from "./users";

/**
 * One apartment charge per period: area × tenant tariff. The building pays services out of these
 * payments, so a charge is never split into service lines.
 */
export const charges = pgTable("charges", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  ownerId: uuid("owner_id").notNull().references(() => owners.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  dueDate: date("due_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<"pending" | "paid" | "partially_paid" | "overdue" | "cancelled">(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  periodUnitUnique: unique("uq_charges_tenant_unit_period").on(
    table.tenantId,
    table.unitId,
    table.periodYear,
    table.periodMonth,
  ),
}));
