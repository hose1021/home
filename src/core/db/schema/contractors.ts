import {date, decimal, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {users} from "./users";

export const contractors = pgTable("contractors", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  taxId: varchar("tax_id", { length: 20 }),
  specialties: varchar("specialties", { length: 100 }).array(),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  status: varchar("status", { length: 20 }).notNull().default("active").$type<"invited" | "active" | "suspended" | "terminated">(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contracts = pgTable("contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  contractorId: uuid("contractor_id").notNull().references(() => contractors.id),
  contractNumber: varchar("contract_number", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 20 }).default("draft").$type<"draft" | "active" | "completed" | "terminated" | "cancelled">(),
  documentUrl: text("document_url"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
