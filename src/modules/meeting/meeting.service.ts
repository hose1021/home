import {db} from "@/core/db";
import {meetingAgendas, meetings} from "@/core/db/schema/meetings";
import {and, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";

export async function getMeetingById(tenantId: string, id: string) {
  const [m] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.tenantId, tenantId)))
    .limit(1);
  return m ?? null;
}

export async function listMeetings(tenantId: string) {
  return await db
    .select()
    .from(meetings)
    .where(eq(meetings.tenantId, tenantId))
    .orderBy(meetings.proposedDate);
}

export async function createMeeting(tenantId: string, userId: string, input: {
  title: string;
  meetingType: "annual" | "extraordinary" | "board" | "audit";
  meetingFormat: "in_person" | "online" | "mixed";
  proposedDate: Date;
  location?: string;
  onlineLink?: string;
  agendas: { title: string; description?: string; sortOrder: number }[];
}) {
  const [meeting] = await db.insert(meetings).values({
    tenantId,
    title: input.title,
    meetingType: input.meetingType,
    meetingFormat: input.meetingFormat,
    status: "scheduled",
    proposedDate: input.proposedDate,
    location: input.location ?? null,
    onlineLink: input.onlineLink ?? null,
    createdBy: userId,
  }).returning();

  if (input.agendas.length > 0) {
    await db.insert(meetingAgendas).values(
      input.agendas.map((a) => ({
        meetingId: meeting.id,
        title: a.title,
        description: a.description ?? null,
        sortOrder: a.sortOrder,
      })),
    );
  }

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "meeting",
    entityId: meeting.id,
    newValues: { title: input.title, meetingType: input.meetingType, proposedDate: input.proposedDate },
  });

  return meeting;
}

export async function updateMeeting(tenantId: string, id: string, input: {
  title?: string;
  meetingType?: "annual" | "extraordinary" | "board" | "audit";
  meetingFormat?: "in_person" | "online" | "mixed";
  status?: string;
  proposedDate?: Date;
  actualDate?: Date | null;
  location?: string | null;
  onlineLink?: string | null;
}, userId: string) {
  const [existing] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.tenantId, tenantId)))
    .limit(1);
  if (!existing) return null;

  const [updated] = await db
    .update(meetings)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(meetings.id, id), eq(meetings.tenantId, tenantId)))
    .returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "meeting",
    entityId: id,
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: input as unknown as Record<string, unknown>,
  });

  return updated;
}

export async function deleteMeeting(tenantId: string, id: string, userId: string) {
  const [existing] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.tenantId, tenantId)))
    .limit(1);
  if (!existing) return;

  await db
    .update(meetings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(meetings.id, id), eq(meetings.tenantId, tenantId)));

  await writeAuditLog({
    tenantId,
    userId,
    action: "delete",
    entityType: "meeting",
    entityId: id,
    oldValues: { title: existing.title } as Record<string, unknown>,
  });
}
