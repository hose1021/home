import {sql} from "drizzle-orm";
import {boolean, check, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import type {Role} from "@/core/auth/permissions";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  username: varchar("username", { length: 100 }).unique().notNull(),
  phone: varchar("phone", { length: 50 }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  usernameFormat: check(
    "chk_users_username_format",
    sql`${table.username} ~ '^[[:alpha:]]+\\.[[:alpha:]]+$'`,
  ),
}));

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  token: varchar("token", { length: 255 }).unique().notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).notNull().$type<Role>(),
  isChairman: boolean("is_chairman").notNull().default(false),
  scopeTenantId: uuid("scope_tenant_id").references(() => tenants.id),
  scopeUnitId: uuid("scope_unit_id"),
}, (table) => ({
  userRoleUnique: { columns: [table.userId, table.role, table.scopeTenantId, table.scopeUnitId], name: "uq_user_roles" },
  roleAllowed: check(
    "chk_user_roles_allowed",
    sql`${table.role} in ('admin', 'management_member', 'commandant', 'owner')`,
  ),
}));
