"use server";

import {revalidatePath} from "next/cache";
import {getTranslations} from "next-intl/server";
import {z} from "zod";
import {requireTenantPermission} from "@/core/auth/session";
import {translateDomainError} from "@/core/errors/app-error";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createAnnouncement, deleteAnnouncement, updateAnnouncement} from "./announcement.service";

const announcementInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1).max(20000),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  isPinned: z.boolean().optional(),
  isDashboard: z.boolean().optional(),
});

export async function createAnnouncementAction(input: {
  title: string;
  content: string;
  priority?: "low" | "normal" | "high" | "urgent";
  isPinned?: boolean;
  isDashboard?: boolean;
}) {
  const t = await getTranslations("announcements.errors");
  input = announcementInputSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("announcement:write");
  try {
    await createAnnouncement(tenantId, session.user.id, input);
  } catch (err) {
    translateDomainError(err, t);
  }
  revalidatePath("/announcements");
  revalidatePath("/");
  return { success: true };
}

export async function updateAnnouncementAction(id: string, input: {
  title?: string;
  content?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  isPinned?: boolean;
  isDashboard?: boolean;
  status?: "active" | "archived";
}) {
  const t = await getTranslations("announcements.errors");
  id = uuidSchema.parse(id);
  input = announcementInputSchema.partial().extend({ status: z.enum(["active", "archived"]).optional() }).parse(input);
  const { session, tenantId } = await requireTenantPermission("announcement:write");
  try {
    await updateAnnouncement(tenantId, id, session.user.id, input);
  } catch (err) {
    translateDomainError(err, t);
  }
  revalidatePath("/announcements");
  revalidatePath("/");
  return { success: true };
}

export async function deleteAnnouncementAction(id: string) {
  const t = await getTranslations("announcements.errors");
  id = uuidSchema.parse(id);
  const { session, tenantId } = await requireTenantPermission("announcement:write");
  try {
    await deleteAnnouncement(tenantId, id, session.user.id);
  } catch (err) {
    translateDomainError(err, t);
  }
  revalidatePath("/announcements");
  return { success: true };
}
