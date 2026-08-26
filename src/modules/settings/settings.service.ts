import {eq} from "drizzle-orm";
import {db} from "@/core/db";
import {users} from "@/core/db/schema/users";
import {deleteOtherUserSessions, hashPassword, verifyPassword} from "@/core/auth/auth";
import {syncUserOwnerProfile, type ProfilePatch} from "@/modules/owner/owner.service";
import {writeAuditLog} from "@/core/audit/audit.service";
import {DomainError} from "@/core/errors/app-error";

/** Update the caller's own profile: user row + owner mirror atomically, audited. */
export async function updateProfile(userId: string, input: ProfilePatch) {
  await db.transaction(async (tx) => {
    await syncUserOwnerProfile(tx, userId, input);
    await writeAuditLog({
      tenantId: await currentTenantId(userId),
      userId,
      action: "update",
      entityType: "user",
      entityId: userId,
      newValues: input as unknown as Record<string, unknown>,
    }, tx);
  });
  return { success: true };
}

/** Change own password: verify current, hash new, drop every other session. `keepToken` survives (the caller's session). */
export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string, keepToken?: string) {
  const [user] = await db
    .select({passwordHash: users.passwordHash})
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new DomainError("user_not_found", "Пользователь не найден");

  const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentValid) throw new DomainError("wrong_current_password", "Текущий пароль неверный");

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, userId));

  await deleteOtherUserSessions(userId, keepToken);
  return { success: true };
}

async function currentTenantId(userId: string): Promise<string> {
  const [user] = await db
    .select({tenantId: users.tenantId})
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new DomainError("user_not_found", "Пользователь не найден");
  return user.tenantId;
}
