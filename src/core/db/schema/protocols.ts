import {pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {meetings} from "./meetings";
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
  protocolNumberUnique: { columns: [table.tenantId, table.protocolNumber], name: "uq_protocols_tenant_number" },
}));

export const protocolSignatures = pgTable("protocol_signatures", {
  id: uuid("id").defaultRandom().primaryKey(),
  protocolId: uuid("protocol_id").notNull().references(() => protocols.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  signature: text("signature").notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  protocolUserUnique: { columns: [table.protocolId, table.userId], name: "uq_protocol_signatures" },
}));
