import {boolean, foreignKey, jsonb, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {users} from "./users";

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  body: text("body"),
  channel: varchar("channel", { length: 20 }).notNull().$type<"push" | "sms" | "in_app">(),
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata").default({}),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
}, (table) => ({
  tenantUserForeignKey: foreignKey({
    columns: [table.tenantId, table.userId],
    foreignColumns: [users.tenantId, users.id],
    name: "fk_notifications_tenant_user",
  }),
}));
