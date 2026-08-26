import {foreignKey, pgTable, text, timestamp, unique, uuid, varchar} from "drizzle-orm/pg-core";
import {meetings} from "./meetings";
import {tenants} from "./tenants";
import {users} from "./users";

export const protocols = pgTable("protocols", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  meetingId: uuid("meeting_id").notNull().references(() => meetings.id),
  protocolNumber: varchar("protocol_number", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("draft").$type<"draft" | "pending_signature" | "signed" | "archived">(),
  content: text("content").notNull(),
  documentUrl: text("document_url"),
  ipfsHash: varchar("ipfs_hash", { length: 64 }),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  protocolNumberUnique: unique("uq_protocols_tenant_number").on(table.tenantId, table.protocolNumber),
  tenantMeetingForeignKey: foreignKey({
    columns: [table.tenantId, table.meetingId],
    foreignColumns: [meetings.tenantId, meetings.id],
    name: "fk_protocols_tenant_meeting",
  }),
}));

export const protocolSignatures = pgTable("protocol_signatures", {
  id: uuid("id").defaultRandom().primaryKey(),
  protocolId: uuid("protocol_id").notNull().references(() => protocols.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  signature: text("signature").notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  protocolUserUnique: unique("uq_protocol_signatures").on(table.protocolId, table.userId),
}));
