import {and, eq, inArray} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import type {MeetingFormat, MeetingStatus, MeetingType} from "@/core/db/schema/enums";
import {meetingAgendas, meetings} from "@/core/db/schema/meetings";
import {DomainError} from "@/core/errors/app-error";

type AgendaInput = {title: string; description?: string; sortOrder: number};

export async function listMeetings(tenantId: string) {
  const rows = await db
    .select()
    .from(meetings)
    .where(eq(meetings.tenantId, tenantId))
    .orderBy(meetings.proposedDate)
    .limit(500);

  if (rows.length === 0) return [];

  const agendas = await db
    .select()
    .from(meetingAgendas)
    .where(inArray(meetingAgendas.meetingId, rows.map((m) => m.id)))
    .orderBy(meetingAgendas.sortOrder);

  const agendasByMeeting = new Map<string, typeof agendas>();
  for (const agenda of agendas) {
    const list = agendasByMeeting.get(agenda.meetingId) ?? [];
    list.push(agenda);
    agendasByMeeting.set(agenda.meetingId, list);
  }

  return rows.map((meeting) => ({...meeting, agendas: agendasByMeeting.get(meeting.id) ?? []}));
}

export async function createMeeting(tenantId: string, userId: string, input: {
  title: string;
  meetingType: MeetingType;
  meetingFormat: MeetingFormat;
  proposedDate: Date;
  location?: string;
  onlineLink?: string;
  agendas: AgendaInput[];
}) {
  const [meeting] = await db.insert(meetings).values({
    tenantId,
    title: input.title,
    meetingType: input.meetingType,
    meetingFormat: input.meetingFormat,
    status: "planned",
    proposedDate: input.proposedDate,
    location: input.location ?? null,
    onlineLink: input.onlineLink ?? null,
    createdBy: userId,
  }).returning();
  if (!meeting) throw new DomainError("meetingNotFound");

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
    newValues: {title: input.title, meetingType: input.meetingType, proposedDate: input.proposedDate},
  });

  return meeting;
}

export async function updateMeeting(tenantId: string, id: string, input: {
  title?: string;
  meetingType?: MeetingType;
  meetingFormat?: MeetingFormat;
  status?: MeetingStatus;
  proposedDate?: Date;
  actualDate?: Date | null;
  location?: string | null;
  onlineLink?: string | null;
  agendas?: AgendaInput[];
}, userId: string) {
  const [existing] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.tenantId, tenantId)))
    .limit(1);
  if (!existing) throw new DomainError("meetingNotFound");

  const {agendas, ...fields} = input;
  const [updated] = await db
    .update(meetings)
    .set({...fields, updatedAt: new Date()})
    .where(and(eq(meetings.id, id), eq(meetings.tenantId, tenantId)))
    .returning();

  if (agendas) {
    await db.delete(meetingAgendas).where(eq(meetingAgendas.meetingId, id));
    if (agendas.length > 0) {
      await db.insert(meetingAgendas).values(
        agendas.map((a) => ({meetingId: id, title: a.title, description: a.description ?? null, sortOrder: a.sortOrder})),
      );
    }
  }

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "meeting",
    entityId: id,
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: fields as unknown as Record<string, unknown>,
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
    .set({status: "cancelled", updatedAt: new Date()})
    .where(and(eq(meetings.id, id), eq(meetings.tenantId, tenantId)));

  await writeAuditLog({
    tenantId,
    userId,
    action: "delete",
    entityType: "meeting",
    entityId: id,
    oldValues: {title: existing.title} as Record<string, unknown>,
  });
}
