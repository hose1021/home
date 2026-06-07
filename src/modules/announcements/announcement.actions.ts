"use server";

import {revalidatePath} from "next/cache";
import {requireAuth} from "@/core/auth/session";
import {ensureTenantExists} from "@/core/multi-tenant";
import {createAnnouncement, deleteAnnouncement, updateAnnouncement} from "./announcement.service";

export async function createAnnouncementAction(slug: string, input: {
  title: string;
  content: string;
  priority?: "low" | "normal" | "high" | "urgent";
  isPinned?: boolean;
}) {
  const session = await requireAuth();
  const tenantId = await ensureTenantExists(slug);
  await createAnnouncement(tenantId, session.user.id, input);
  revalidatePath(`/${slug}/announcements`);
  return { success: true };
}

export async function updateAnnouncementAction(slug: string, id: string, input: {
  title?: string;
  content?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  isPinned?: boolean;
  status?: "active" | "archived";
}) {
  const session = await requireAuth();
  const tenantId = await ensureTenantExists(slug);
  await updateAnnouncement(tenantId, id, session.user.id, input);
  revalidatePath(`/${slug}/announcements`);
  return { success: true };
}

export async function deleteAnnouncementAction(slug: string, id: string) {
  const session = await requireAuth();
  const tenantId = await ensureTenantExists(slug);
  await deleteAnnouncement(tenantId, id, session.user.id);
  revalidatePath(`/${slug}/announcements`);
  return { success: true };
}
