"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {createAnnouncement, deleteAnnouncement, updateAnnouncement} from "./announcement.service";
import {uuidSchema} from "@/core/validation/action-schemas";
import {z} from "zod";

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
  input = announcementInputSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("announcement:write");
  await createAnnouncement(tenantId, session.user.id, input);
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
  id = uuidSchema.parse(id);
  input = announcementInputSchema.partial().extend({ status: z.enum(["active", "archived"]).optional() }).parse(input);
  const { session, tenantId } = await requireTenantPermission("announcement:write");
  await updateAnnouncement(tenantId, id, session.user.id, input);
  revalidatePath("/announcements");
  revalidatePath("/");
  return { success: true };
}

export async function deleteAnnouncementAction(id: string) {
  id = uuidSchema.parse(id);
  const { session, tenantId } = await requireTenantPermission("announcement:write");
  await deleteAnnouncement(tenantId, id, session.user.id);
  revalidatePath("/announcements");
  return { success: true };
}
