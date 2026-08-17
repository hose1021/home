"use server";

import {revalidatePath} from "next/cache";
import {cookies} from "next/headers";
import {z} from "zod";
import {and, eq, ne} from "drizzle-orm";
import {db} from "@/core/db";
import {users} from "@/core/db/schema/users";
import {owners} from "@/core/db/schema/owners";
import {requireAuth, requireTenantPermission, getSessionCookieName} from "@/core/auth/session";
import {deleteOtherUserSessions, hashPassword, verifyPassword} from "@/core/auth/auth";
import {updateTenant} from "@/modules/tenant/tenant.service";

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(255),
  address: z.string().trim().max(1000).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  taxId: z.string().trim().max(20).nullable().optional(),
});

export async function updateSettingsAction(input: {
  name: string;
  address?: string | null;
  phone?: string | null;
  taxId?: string | null;
}) {
  const validated = settingsSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("settings:write");
  await updateTenant(tenantId, validated, session.user.id);
  revalidatePath("/", "layout");
  return { success: true };
}

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  phone: z.string().trim().max(50).nullable().optional(),
});

export async function updateProfileAction(input: {
  fullName: string;
  phone?: string | null;
}) {
  const validated = profileSchema.parse(input);
  const session = await requireAuth();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ fullName: validated.fullName, phone: validated.phone ?? null, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    const [owner] = await tx
      .select({ id: owners.id })
      .from(owners)
      .where(and(eq(owners.userId, session.user.id), ne(owners.status, "deleted")))
      .limit(1);
    if (owner) {
      await tx
        .update(owners)
        .set({ fullName: validated.fullName, phone: validated.phone ?? null })
        .where(eq(owners.id, owner.id));
    }
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function changeOwnPasswordAction(currentPassword: string, newPassword: string) {
  newPassword = z.string().min(12).max(128).parse(newPassword);
  const session = await requireAuth();

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user) throw new Error("Пользователь не найден");

  const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentValid) throw new Error("Текущий пароль неверный");

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(getSessionCookieName())?.value;
  await deleteOtherUserSessions(session.user.id, currentToken);

  return { success: true };
}
