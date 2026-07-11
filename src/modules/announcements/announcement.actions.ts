"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {createAnnouncement, deleteAnnouncement, updateAnnouncement} from "./announcement.service";

export async function createAnnouncementAction(input: {
  title: string;
  content: string;
  priority?: "low" | "normal" | "high" | "urgent";
  isPinned?: boolean;
  isDashboard?: boolean;
}) {
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
  const { session, tenantId } = await requireTenantPermission("announcement:write");
  await updateAnnouncement(tenantId, id, session.user.id, input);
  revalidatePath("/announcements");
  revalidatePath("/");
  return { success: true };
}

export async function deleteAnnouncementAction(id: string) {
  const { session, tenantId } = await requireTenantPermission("announcement:write");
  await deleteAnnouncement(tenantId, id, session.user.id);
  revalidatePath("/announcements");
  return { success: true };
}
