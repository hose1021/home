import {foreignKey, index, pgTable, text, timestamp, uuid, varchar, bigint} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {users} from "./users";

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  title: varchar("title", {length: 255}).notNull(),
  category: varchar("category", {length: 50}).notNull(),
  description: text("description"),
  originalFileName: varchar("original_file_name", {length: 255}).notNull(),
  mimeType: varchar("mime_type", {length: 100}).notNull(),
  sizeBytes: bigint("size_bytes", {mode: "number"}).notNull(),
  objectKey: varchar("object_key", {length: 100}).notNull(),
  status: varchar("status", {length: 20}).default("active").$type<"active" | "archived">(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_documents_tenant").on(table.tenantId),
  tenantUserForeignKey: foreignKey({
    columns: [table.tenantId, table.createdBy],
    foreignColumns: [users.tenantId, users.id],
    name: "fk_documents_tenant_user",
  }),
}));
