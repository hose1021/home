"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/core/auth/session";
import { ensureTenantExists } from "@/core/multi-tenant";
import { createMeeting, updateMeeting, deleteMeeting } from "./meeting.service";
import { db } from "@/core/db";
import { meetingAgendas } from "@/core/db/schema/meetings";
import { eq } from "drizzle-orm";

export async function createMeetingAction(slug: string, input: {
  title: string;
  meetingType: "annual" | "extraordinary" | "board" | "audit";
  meetingFormat: "in_person" | "online" | "mixed";
  proposedDate: string;
  location?: string;
  onlineLink?: string;
  agendas: { title: string; description?: string; sortOrder: number }[];
}) {
  const session = await requireAuth();
  const tenantId = await ensureTenantExists(slug);
  await createMeeting(tenantId, session.user.id, {
    ...input,
    proposedDate: new Date(input.proposedDate),
  });
  revalidatePath(`/${slug}/meetings`);
  return { success: true };
}

export async function updateMeetingAction(slug: string, id: string, input: {
  title?: string;
  meetingType?: "annual" | "extraordinary" | "board" | "audit";
  meetingFormat?: "in_person" | "online" | "mixed";
  status?: string;
  proposedDate?: string;
  location?: string | null;
  agendas?: { title: string; description?: string; sortOrder: number }[];
}) {
  await requireAuth();
  const tenantId = await ensureTenantExists(slug);
  await updateMeeting(tenantId, id, {
    ...input,
    proposedDate: input.proposedDate ? new Date(input.proposedDate) : undefined,
  });

  if (input.agendas) {
    await db.delete(meetingAgendas).where(eq(meetingAgendas.meetingId, id));
    if (input.agendas.length > 0) {
      await db.insert(meetingAgendas).values(
        input.agendas.map((a) => ({ meetingId: id, title: a.title, description: a.description ?? null, sortOrder: a.sortOrder })),
      );
    }
  }

  revalidatePath(`/${slug}/meetings`);
  return { success: true };
}

export async function deleteMeetingAction(slug: string, id: string) {
  await requireAuth();
  const tenantId = await ensureTenantExists(slug);
  await deleteMeeting(tenantId, id);
  revalidatePath(`/${slug}/meetings`);
  return { success: true };
}
