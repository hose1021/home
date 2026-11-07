import {eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {deleteOtherUserSessions, hashPassword, verifyPassword} from "@/core/auth/auth";
import {db} from "@/core/db";
import {users} from "@/core/db/schema/users";
import {DomainError} from "@/core/errors/app-error";
import {syncUserOwnerProfile, type ProfilePatch} from "@/modules/owner/owner.service";

/** The caller's profile row, for the settings page. */
export async function getOwnProfile(userId: string) {
  const [user] = await db
    .select({fullName: users.fullName, phone: users.phone})
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

/** Update the caller's own profile: user row + owner mirror atomically, audited. */
export async function updateProfile(userId: string, input: ProfilePatch) {
  const tenantId = await currentTenantId(userId);
  await db.transaction(async (tx) => {
    await syncUserOwnerProfile(tx, userId, input);
    await writeAuditLog({
      tenantId,
      userId,
      action: "update",
      entityType: "user",
      entityId: userId,
      newValues: input as unknown as Record<string, unknown>,
    }, tx);
  });
  return {success: true};
}

/** Change own password: verify current, hash new, drop every other session. `keepToken` survives (the caller's session). */
export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string, keepToken?: string) {
  const [user] = await db
    .select({passwordHash: users.passwordHash, tenantId: users.tenantId})
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new DomainError("user_not_found");

  const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentValid) throw new DomainError("wrong_current_password");

  await db
    .update(users)
    .set({passwordHash: await hashPassword(newPassword), updatedAt: new Date()})
    .where(eq(users.id, userId));

  await deleteOtherUserSessions(userId, keepToken);

  await writeAuditLog({
    tenantId: user.tenantId,
    userId,
    action: "update",
    entityType: "user",
    entityId: userId,
    newValues: {passwordChanged: true},
  });
  return {success: true};
}

async function currentTenantId(userId: string): Promise<string> {
  const [user] = await db
    .select({tenantId: users.tenantId})
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new DomainError("user_not_found");
  return user.tenantId;
}
