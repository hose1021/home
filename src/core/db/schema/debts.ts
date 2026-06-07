import { pgTable, uuid, varchar, timestamp, integer, decimal } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { owners } from "./owners";
import { units } from "./units";

export const debts = pgTable("debts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  ownerId: uuid("owner_id").notNull().references(() => owners.id),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  totalDebt: decimal("total_debt", { precision: 12, scale: 2 }).notNull().default("0"),
  overdueDays: integer("overdue_days").notNull().default(0),
  status: varchar("status", { length: 20 }).$type<"active" | "payment_plan" | "collected" | "written_off">(),
  lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
