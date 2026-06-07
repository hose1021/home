import { pgTable, uuid, varchar, timestamp, date } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { units } from "./units";

export const residents = pgTable("residents", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  userId: uuid("user_id"),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  idNumber: varchar("id_number", { length: 20 }),
  phone: varchar("phone", { length: 50 }),
  residentType: varchar("resident_type", { length: 20 }).$type<"owner" | "family" | "tenant" | "guest">(),
  movedInAt: date("moved_in_at").notNull(),
  movedOutAt: date("moved_out_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
