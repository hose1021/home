"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {createMeeting, deleteMeeting, updateMeeting} from "./meeting.service";
import {db} from "@/core/db";
import {meetingAgendas} from "@/core/db/schema/meetings";
import {eq} from "drizzle-orm";

export async function createMeetingAction(slug: string, input: {
  title: string;
  meetingType: "annual" | "extraordinary" | "board" | "audit";
  meetingFormat: "in_person" | "online" | "mixed";
  proposedDate: string;
  location?: string;
  onlineLink?: string;
  agendas: { title: string; description?: string; sortOrder: number }[];
}) {
  const { session, tenantId } = await requireTenantPermission(slug, "meeting:write");
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
  const { session, tenantId } = await requireTenantPermission(slug, "meeting:write");
  await updateMeeting(tenantId, id, {
    ...input,
    proposedDate: input.proposedDate ? new Date(input.proposedDate) : undefined,
  }, session.user.id);

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
  const { session, tenantId } = await requireTenantPermission(slug, "meeting:write");
  await deleteMeeting(tenantId, id, session.user.id);
  revalidatePath(`/${slug}/meetings`);
  return { success: true };
}
