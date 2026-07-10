"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {createAnnouncement, deleteAnnouncement, updateAnnouncement} from "./announcement.service";

export async function createAnnouncementAction(slug: string, input: {
  title: string;
  content: string;
  priority?: "low" | "normal" | "high" | "urgent";
  isPinned?: boolean;
  isDashboard?: boolean;
}) {
  const { session, tenantId } = await requireTenantPermission(slug, "announcement:write");
  await createAnnouncement(tenantId, session.user.id, input);
  revalidatePath(`/${slug}/announcements`);
  revalidatePath(`/${slug}`);
  return { success: true };
}

export async function updateAnnouncementAction(slug: string, id: string, input: {
  title?: string;
  content?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  isPinned?: boolean;
  isDashboard?: boolean;
  status?: "active" | "archived";
}) {
  const { session, tenantId } = await requireTenantPermission(slug, "announcement:write");
  await updateAnnouncement(tenantId, id, session.user.id, input);
  revalidatePath(`/${slug}/announcements`);
  revalidatePath(`/${slug}`);
  return { success: true };
}

export async function deleteAnnouncementAction(slug: string, id: string) {
  const { session, tenantId } = await requireTenantPermission(slug, "announcement:write");
  await deleteAnnouncement(tenantId, id, session.user.id);
  revalidatePath(`/${slug}/announcements`);
  return { success: true };
}
