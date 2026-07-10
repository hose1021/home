import {decimal, integer, pgTable, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {buildings} from "./buildings";

export const units = pgTable("units", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  buildingId: uuid("building_id").notNull().references(() => buildings.id),
  unitNumber: varchar("unit_number", { length: 50 }).notNull(),
  entrance: integer("entrance").notNull(),
  floor: integer("floor").notNull(),
  type: varchar("type", { length: 20 }).notNull().$type<"residential" | "commercial" | "parking" | "storage" | "other">(),
  area: decimal("area", { precision: 10, scale: 2 }).notNull(),
  cadastreNumber: varchar("cadastre_number", { length: 50 }),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  unitPerBuildingUnique: { columns: [table.tenantId, table.buildingId, table.unitNumber], name: "uq_units_tenant_building_number" },
}));
