import {boolean, decimal, integer, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";

export const buildings = pgTable("buildings", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  cadastreNumber: varchar("cadastre_number", { length: 50 }),
  totalFloors: integer("total_floors").notNull(),
  totalEntrances: integer("total_entrances").notNull().default(1),
  hasElevator: boolean("has_elevator").default(false),
  yearBuilt: integer("year_built"),
  landArea: decimal("land_area", { precision: 10, scale: 2 }),
  totalArea: decimal("total_area", { precision: 10, scale: 2 }),
  livingArea: decimal("living_area", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
