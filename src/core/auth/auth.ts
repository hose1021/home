import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import {and, eq, gt, isNull, ne, or} from "drizzle-orm";
import {db} from "@/core/db";
import {owners} from "@/core/db/schema/owners";
import {tenants} from "@/core/db/schema/tenants";
import {sessions, userRoles, users} from "@/core/db/schema/users";
import {USERNAME_PATTERN} from "./constants";
import type {Role} from "./permissions";

const SALT_ROUNDS = 12;
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  roles: Role[];
  isPlatformAdmin: boolean;
};

export function normalizeUsername(username: string): string {
  return username.trim().toLocaleLowerCase("az");
}

export function assertValidUsername(username: string): void {
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("Username must use the format name.surname");
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(input: {
  tenantId: string;
  username: string;
  password: string;
  fullName: string;
  phone?: string;
}) {
  const username = normalizeUsername(input.username);
  assertValidUsername(username);
  const passwordHash = await hashPassword(input.password);

  const user = await db.transaction(async (tx) => {
    const [createdUser] = await tx
      .insert(users)
      .values({
        tenantId: input.tenantId,
        username,
        fullName: input.fullName,
        passwordHash,
        phone: input.phone ?? null,
      })
      .returning();
    if (!createdUser) throw new Error("Failed to create user");

    await tx.insert(owners).values({
      tenantId: input.tenantId,
      userId: createdUser.id,
      fullName: createdUser.fullName,
      phone: createdUser.phone,
    });
    await tx.insert(userRoles).values({
      userId: createdUser.id,
      role: "owner",
      scopeTenantId: input.tenantId,
    });

    return createdUser;
  });

  return user;
}

export async function authenticateUser(usernameInput: string, password: string) {
  const username = normalizeUsername(usernameInput);
  const [user] = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      username: users.username,
      fullName: users.fullName,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .innerJoin(tenants, eq(tenants.id, users.tenantId))
    .where(and(
      eq(users.username, username),
      eq(users.isActive, true),
      eq(tenants.status, "active"),
    ))
    .limit(1);

  if (!user) return null;

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) return null;

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  return user;
}

export async function createSession(userId: string, tenantId: string, ipAddress?: string, userAgent?: string) {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      tenantId,
      token: hashSessionToken(token),
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      expiresAt,
    })
    .returning();

  return { session, token };
}

export async function getSessionFromToken(token: string): Promise<SessionUser | null> {
  const tokenHash = hashSessionToken(token);
  const [result] = await db
    .select({
      userId: sessions.userId,
      tenantId: sessions.tenantId,
      username: users.username,
      fullName: users.fullName,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(tenants, eq(tenants.id, sessions.tenantId))
    .where(and(
      eq(sessions.token, tokenHash),
      gt(sessions.expiresAt, new Date()),
      eq(sessions.tenantId, users.tenantId),
      eq(users.isActive, true),
      eq(tenants.status, "active"),
    ))
    .limit(1);

  if (!result) return null;

  const roleRows = await loadRoleRows(result.userId, result.tenantId);
  const roles = rolesFromDatabase(roleRows);
  if (roles.length === 0) return null;

  return {
    id: result.userId,
    tenantId: result.tenantId,
    username: result.username,
    fullName: result.fullName,
    roles,
    isPlatformAdmin: hasPlatformAdminRole(roleRows),
  };
}

async function loadRoleRows(userId: string, tenantId: string) {
  return db
    .select({ role: userRoles.role, scopeTenantId: userRoles.scopeTenantId })
    .from(userRoles)
    .where(and(
      eq(userRoles.userId, userId),
      or(
        eq(userRoles.scopeTenantId, tenantId),
        and(eq(userRoles.role, "admin"), isNull(userRoles.scopeTenantId)),
      ),
    ));
}

/** Another tenant user's session identity, for admin "view as user". Inactive or unknown users are null. */
export async function getSessionUserById(userId: string, tenantId: string): Promise<SessionUser | null> {
  const [result] = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      username: users.username,
      fullName: users.fullName,
    })
    .from(users)
    .where(and(
      eq(users.id, userId),
      eq(users.tenantId, tenantId),
      eq(users.isActive, true),
    ))
    .limit(1);
  if (!result) return null;

  const roleRows = await loadRoleRows(result.id, result.tenantId);
  const roles = rolesFromDatabase(roleRows);
  if (roles.length === 0) return null;

  return {
    id: result.id,
    tenantId: result.tenantId,
    username: result.username,
    fullName: result.fullName,
    roles,
    isPlatformAdmin: hasPlatformAdminRole(roleRows),
  };
}

export function rolesFromDatabase(rows: ReadonlyArray<{role: Role}>): Role[] {
  return [...new Set(rows.map((row) => row.role))];
}

export function hasPlatformAdminRole(rows: ReadonlyArray<{role: Role; scopeTenantId: string | null}>): boolean {
  return rows.some((row) => row.role === "admin" && row.scopeTenantId === null);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, hashSessionToken(token)));
}

export async function deleteOtherUserSessions(userId: string, currentToken?: string) {
  const conditions = [eq(sessions.userId, userId)];
  if (currentToken) conditions.push(ne(sessions.token, hashSessionToken(currentToken)));
  await db.delete(sessions).where(and(...conditions));
}
