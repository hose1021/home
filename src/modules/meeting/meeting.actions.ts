"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {createMeeting, deleteMeeting, updateMeeting} from "./meeting.service";
import {db} from "@/core/db";
import {meetingAgendas} from "@/core/db/schema/meetings";
import {eq} from "drizzle-orm";

export async function createMeetingAction(input: {
  title: string;
  meetingType: "annual" | "extraordinary" | "board" | "audit";
  meetingFormat: "in_person" | "online" | "mixed";
  proposedDate: string;
  location?: string;
  onlineLink?: string;
  agendas: { title: string; description?: string; sortOrder: number }[];
}) {
  const { session, tenantId } = await requireTenantPermission("meeting:write");
  await createMeeting(tenantId, session.user.id, {
    ...input,
    proposedDate: new Date(input.proposedDate),
  });
  revalidatePath("/meetings");
  return { success: true };
}

export async function updateMeetingAction(id: string, input: {
  title?: string;
  meetingType?: "annual" | "extraordinary" | "board" | "audit";
  meetingFormat?: "in_person" | "online" | "mixed";
  status?: string;
  proposedDate?: string;
  location?: string | null;
  agendas?: { title: string; description?: string; sortOrder: number }[];
}) {
  const { session, tenantId } = await requireTenantPermission("meeting:write");
  const {agendas, proposedDate, ...meetingInput} = input;
  const updated = await updateMeeting(tenantId, id, {
    ...meetingInput,
    proposedDate: proposedDate ? new Date(proposedDate) : undefined,
  }, session.user.id);
  if (!updated) throw new Error("Meeting not found");

  if (agendas) {
    await db.delete(meetingAgendas).where(eq(meetingAgendas.meetingId, id));
    if (agendas.length > 0) {
      await db.insert(meetingAgendas).values(
        agendas.map((a) => ({ meetingId: id, title: a.title, description: a.description ?? null, sortOrder: a.sortOrder })),
      );
    }
  }

  revalidatePath("/meetings");
  return { success: true };
}

export async function deleteMeetingAction(id: string) {
  const { session, tenantId } = await requireTenantPermission("meeting:write");
  await deleteMeeting(tenantId, id, session.user.id);
  revalidatePath("/meetings");
  return { success: true };
}
