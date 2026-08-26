"use server";

import {eq} from "drizzle-orm";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireTenantPermission} from "@/core/auth/session";
import {db} from "@/core/db";
import {meetingAgendas} from "@/core/db/schema/meetings";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createMeeting, deleteMeeting, updateMeeting} from "./meeting.service";

const meetingInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  meetingType: z.enum(["annual", "extraordinary", "board", "audit"]),
  meetingFormat: z.enum(["in_person", "online", "mixed"]),
  proposedDate: z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), "Invalid meeting date"),
  location: z.string().trim().max(255).optional(),
  onlineLink: z.string().url().max(2000).optional(),
  agendas: z.array(z.object({ title: z.string().trim().min(1).max(255), description: z.string().trim().max(2000).optional(), sortOrder: z.number().int().min(0).max(1000) })).max(100),
});

export async function createMeetingAction(input: {
  title: string;
  meetingType: "annual" | "extraordinary" | "board" | "audit";
  meetingFormat: "in_person" | "online" | "mixed";
  proposedDate: string;
  location?: string;
  onlineLink?: string;
  agendas: { title: string; description?: string; sortOrder: number }[];
}) {
  input = meetingInputSchema.parse(input);
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
  id = uuidSchema.parse(id);
  input = meetingInputSchema.partial().parse(input);
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
  id = uuidSchema.parse(id);
  const { session, tenantId } = await requireTenantPermission("meeting:write");
  await deleteMeeting(tenantId, id, session.user.id);
  revalidatePath("/meetings");
  return { success: true };
}
