import {boolean, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {units} from "./units";
import {users} from "./users";

export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  unitId: uuid("unit_id").references(() => units.id),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  assignedTo: uuid("assigned_to").references(() => users.id),
  category: varchar("category", { length: 50 }).notNull().$type<"plumbing" | "electrical" | "cleaning" | "structural" | "elevator" | "pest_control" | "yard" | "security" | "other">(),
  priority: varchar("priority", { length: 20 }).notNull().default("medium").$type<"low" | "medium" | "high" | "urgent">(),
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<"pending" | "in_progress" | "rejected" | "done">(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketComments = pgTable("ticket_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
