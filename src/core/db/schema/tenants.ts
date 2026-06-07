import { pgTable, uuid, varchar, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
