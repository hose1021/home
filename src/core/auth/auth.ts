import {db} from "@/core/db";
import {sessions, userRoles, users} from "@/core/db/schema/users";
import {owners} from "@/core/db/schema/owners";
import {tenants} from "@/core/db/schema/tenants";
import {and, eq, gt, isNull, or} from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type {Role} from "./permissions";

const SALT_ROUNDS = 12;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  roles: Role[];
};

const USERNAME_PATTERN = /^\p{L}+\.\p{L}+$/u;

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
      or(eq(sessions.token, tokenHash), eq(sessions.token, token)),
      gt(sessions.expiresAt, new Date()),
      eq(sessions.tenantId, users.tenantId),
      eq(users.isActive, true),
      eq(tenants.status, "active"),
    ))
    .limit(1);

  if (!result) return null;

  const roleRows = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(and(
      eq(userRoles.userId, result.userId),
      or(
        eq(userRoles.scopeTenantId, result.tenantId),
        and(eq(userRoles.role, "admin"), isNull(userRoles.scopeTenantId)),
      ),
    ));

  const roles = rolesFromDatabase(roleRows);
  if (roles.length === 0) return null;

  return {
    id: result.userId,
    tenantId: result.tenantId,
    username: result.username,
    fullName: result.fullName,
    roles,
  };
}

export function rolesFromDatabase(rows: ReadonlyArray<{role: Role}>): Role[] {
  return [...new Set(rows.map((row) => row.role))];
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(or(
    eq(sessions.token, hashSessionToken(token)),
    eq(sessions.token, token),
  ));
}

export async function deleteUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
