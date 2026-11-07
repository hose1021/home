import {boolean, pgTable, text, timestamp, unique, uuid, varchar} from "drizzle-orm/pg-core";
import type {TicketCategory, TicketPriority, TicketStatus} from "./enums";
import {tenants} from "./tenants";
import {units} from "./units";
import {users} from "./users";

export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  unitId: uuid("unit_id").references(() => units.id),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  assignedTo: uuid("assigned_to").references(() => users.id),
  category: varchar("category", { length: 50 }).notNull().$type<TicketCategory>(),
  priority: varchar("priority", { length: 20 }).notNull().default("medium").$type<TicketPriority>(),
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<TicketStatus>(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdUnique: unique("uq_tickets_tenant_id").on(table.tenantId, table.id),
}));

export const ticketComments = pgTable("ticket_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
