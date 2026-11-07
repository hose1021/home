import {decimal, pgTable, timestamp, unique, uuid, varchar} from "drizzle-orm/pg-core";
import type {ContractorStatus} from "./enums";
import {tenants} from "./tenants";

export const contractors = pgTable("contractors", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  taxId: varchar("tax_id", { length: 20 }),
  specialties: varchar("specialties", { length: 100 }).array(),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  status: varchar("status", { length: 20 }).notNull().default("active").$type<ContractorStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdUnique: unique("uq_contractors_tenant_id").on(table.tenantId, table.id),
}));
