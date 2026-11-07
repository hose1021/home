import {boolean, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import type {AnnouncementPriority, AnnouncementStatus} from "./enums";
import {tenants} from "./tenants";
import {users} from "./users";

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default("normal").$type<AnnouncementPriority>(),
  isPinned: boolean("is_pinned").notNull().default(false),
  isDashboard: boolean("is_dashboard").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("active").$type<AnnouncementStatus | "deleted">(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
