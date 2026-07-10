import {boolean, date, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {units} from "./units";
import {users} from "./users";

export const owners = pgTable("owners", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  isLegalEntity: boolean("is_legal_entity").default(false),
  legalName: varchar("legal_name", { length: 255 }),
  taxId: varchar("tax_id", { length: 20 }),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ownerships = pgTable("ownerships", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  ownerId: uuid("owner_id").notNull().references(() => owners.id),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  registeredDate: date("registered_date").notNull(),
  documentUrl: text("document_url"),
  isPrimary: boolean("is_primary").default(true),
}, (table) => ({
  ownerUnitUnique: { columns: [table.ownerId, table.unitId], name: "uq_ownerships_owner_unit" },
}));
