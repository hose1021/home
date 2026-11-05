import {integer, jsonb, numeric, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  taxId: varchar("tax_id", { length: 20 }),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  logoUrl: text("logo_url"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  config: jsonb("config").default({}),
  moduleFlags: integer("module_flags").notNull().default(0),
  /** Monthly apartment rate. Every owner charge is area × tariff; no other charge sources exist. */
  tariffPerSqm: numeric("tariff_per_sqm", { precision: 12, scale: 2 }).notNull().default("0.40"),
  billingStart: varchar("billing_start", { length: 7 }).notNull().default("2025-01"),
  /** Day of the following month when the period charge is due. */
  dueDay: integer("due_day").notNull().default(15),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
