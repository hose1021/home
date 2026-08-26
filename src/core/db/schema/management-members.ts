import {boolean, foreignKey, integer, pgTable, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {owners} from "./owners";
import {tenants} from "./tenants";

export const managementMembers = pgTable("management_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  ownerId: uuid("owner_id").references(() => owners.id),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  blockLabel: varchar("block_label", { length: 100 }).notNull(),
  position: varchar("position", { length: 100 }),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantOwnerForeignKey: foreignKey({
    columns: [table.tenantId, table.ownerId],
    foreignColumns: [owners.tenantId, owners.id],
    name: "fk_management_members_tenant_owner",
  }),
}));
