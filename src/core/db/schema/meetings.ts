import {boolean, integer, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {users} from "./users";
import {owners} from "./owners";

export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  title: varchar("title", { length: 500 }).notNull(),
  meetingType: varchar("meeting_type", { length: 20 }).$type<"annual" | "extraordinary" | "board" | "audit">(),
  meetingFormat: varchar("meeting_format", { length: 20 }).$type<"in_person" | "online" | "mixed">(),
  status: varchar("status", { length: 20 }).default("scheduled"),
  proposedDate: timestamp("proposed_date", { withTimezone: true }).notNull(),
  actualDate: timestamp("actual_date", { withTimezone: true }),
  location: text("location"),
  onlineLink: text("online_link"),
  chairmanId: uuid("chairman_id").references(() => users.id),
  secretaryId: uuid("secretary_id").references(() => users.id),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetingAgendas = pgTable("meeting_agendas", {
  id: uuid("id").defaultRandom().primaryKey(),
  meetingId: uuid("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  votingId: uuid("voting_id"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const meetingAttendees = pgTable("meeting_attendees", {
  id: uuid("id").defaultRandom().primaryKey(),
  meetingId: uuid("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").references(() => owners.id),
  userId: uuid("user_id"),
  attended: boolean("attended").default(false),
  checkInAt: timestamp("check_in_at", { withTimezone: true }),
  signature: text("signature"),
});
