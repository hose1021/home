"use server";

import {revalidatePath} from "next/cache";
import {cookies} from "next/headers";
import {getTranslations} from "next-intl/server";
import {z} from "zod";
import {requireAuth, requireTenantPermission, getSessionCookieName} from "@/core/auth/session";
import {translateDomainError} from "@/core/errors/app-error";
import {updateTenant} from "@/modules/tenant/tenant.service";
import {changeOwnPassword, updateProfile} from "./settings.service";

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
  const t = await getTranslations("settings.errors");
  const validated = profileSchema.parse(input);
  const session = await requireAuth();
  try {
    await updateProfile(session.user.id, validated);
  } catch (err) {
    translateDomainError(err, t);
  }
  revalidatePath("/", "layout");
  return { success: true };
}

export async function changeOwnPasswordAction(currentPassword: string, newPassword: string) {
  const t = await getTranslations("settings.errors");
  newPassword = z.string().min(12).max(128).parse(newPassword);
  const session = await requireAuth();

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(getSessionCookieName())?.value;
  try {
    await changeOwnPassword(session.user.id, currentPassword, newPassword, currentToken);
  } catch (err) {
    translateDomainError(err, t);
  }

  return { success: true };
}
