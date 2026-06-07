import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, timestamp, integer, decimal, boolean, check, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { meetings } from "./meetings";
import { owners } from "./owners";
import { units } from "./units";
import { users } from "./users";

export const votings = pgTable("votings", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  meetingId: uuid("meeting_id").references(() => meetings.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  votingType: varchar("voting_type", { length: 20 }).notNull().$type<"in_person" | "absentee" | "mixed">(),
  countingMethod: varchar("counting_method", { length: 20 }).notNull().$type<"one_per_owner">(),
  status: varchar("status", { length: 20 }).notNull().default("draft").$type<"draft" | "active" | "paused" | "counting" | "completed" | "cancelled" | "archived">(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  quorumRequired: decimal("quorum_required", { precision: 5, scale: 2 }).notNull(),
  quorumAchieved: decimal("quorum_achieved", { precision: 5, scale: 2 }),
  supermajority: boolean("supermajority").notNull().default(false),
  supermajorityPct: decimal("supermajority_pct", { precision: 5, scale: 2 }),
  maxVotesPerOwner: integer("max_votes_per_owner").notNull().default(1),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  oneVotePerOwnerMethod: check(
    "chk_votings_one_per_owner",
    sql`${table.countingMethod} = 'one_per_owner'`,
  ),
}));

export const votingOptions = pgTable("voting_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  votingId: uuid("voting_id").notNull().references(() => votings.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const votes = pgTable("votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  votingId: uuid("voting_id").notNull().references(() => votings.id),
  optionId: uuid("option_id").notNull().references(() => votingOptions.id),
  ownerId: uuid("owner_id").notNull().references(() => owners.id),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  voteWeight: decimal("vote_weight", { precision: 12, scale: 2 }).notNull(),
  proxyId: uuid("proxy_id"),
  votedBy: uuid("voted_by").notNull().references(() => users.id),
  ipAddress: varchar("ip_address", { length: 45 }),
  signatureHash: varchar("signature_hash", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  voteUnique: uniqueIndex("uq_votes_voting_owner").on(table.votingId, table.ownerId),
  unitVoteWeight: check("chk_votes_weight_one", sql`${table.voteWeight} = 1`),
}));

export const proxies = pgTable("proxies", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  principalId: uuid("principal_id").notNull().references(() => owners.id),
  agentId: uuid("agent_id").notNull().references(() => owners.id),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  votingId: uuid("voting_id").references(() => votings.id),
  scope: varchar("scope", { length: 20 }).$type<"single" | "period" | "unlimited">(),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
