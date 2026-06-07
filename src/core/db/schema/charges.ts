import { pgTable, uuid, varchar, timestamp, decimal, date, integer, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { units } from "./units";
import { owners } from "./owners";
import { funds } from "./funds";
import { users } from "./users";

export const chargeTemplates = pgTable("charge_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 30 }).notNull().$type<"monthly" | "special" | "fine" | "rent" | "other">(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  calculation: varchar("calculation", { length: 30 }).notNull().$type<"fixed_per_unit" | "per_owner" | "percentage_of_income">(),
  fundId: uuid("fund_id").references(() => funds.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const charges = pgTable("charges", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid("template_id").references(() => chargeTemplates.id),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  ownerId: uuid("owner_id").notNull().references(() => owners.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  dueDate: date("due_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<"pending" | "paid" | "partially_paid" | "overdue" | "cancelled">(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
