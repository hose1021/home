import {db} from "@/core/db";
import {announcements} from "@/core/db/schema/announcements";
import {and, desc, eq, ne} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";

type CreateInput = {
  title: string;
  content: string;
  priority?: "low" | "normal" | "high" | "urgent";
  isPinned?: boolean;
  isDashboard?: boolean;
};

type UpdateInput = Partial<CreateInput> & {
  status?: "active" | "archived";
};

export async function listAnnouncements(tenantId: string) {
  return await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.tenantId, tenantId), eq(announcements.status, "active")))
    .orderBy(desc(announcements.isDashboard), desc(announcements.isPinned), desc(announcements.createdAt));
}

export async function getDashboardAnnouncement(tenantId: string) {
  const [a] = await db
    .select()
    .from(announcements)
    .where(and(
      eq(announcements.tenantId, tenantId),
      eq(announcements.status, "active"),
      eq(announcements.isDashboard, true),
    ))
    .limit(1);
  return a ?? null;
}

export async function getAnnouncementById(tenantId: string, id: string) {
  const [a] = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenantId)))
    .limit(1);
  return a ?? null;
}

async function unflagOtherDashboard(tenantId: string, exceptId?: string) {
  const conditions = [eq(announcements.tenantId, tenantId), eq(announcements.isDashboard, true)];
  if (exceptId) {
    conditions.push(ne(announcements.id, exceptId));
  }
  await db
    .update(announcements)
    .set({ isDashboard: false, updatedAt: new Date() })
    .where(and(...conditions));
}

export async function createAnnouncement(tenantId: string, userId: string, input: CreateInput) {
  validateAnnouncement(input);
  if (input.isDashboard) {
    await unflagOtherDashboard(tenantId);
  }

  const [a] = await db.insert(announcements).values({
    tenantId,
    createdBy: userId,
    title: input.title,
    content: input.content,
    priority: input.priority ?? "normal",
    isPinned: input.isPinned ?? false,
    isDashboard: input.isDashboard ?? false,
  }).returning();

  await writeAuditLog({
    tenantId, userId,
    action: "create",
    entityType: "announcement",
    entityId: a.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return a;
}

export async function updateAnnouncement(tenantId: string, id: string, userId: string, input: UpdateInput) {
  validateAnnouncement(input);
  if (input.isDashboard) {
    await unflagOtherDashboard(tenantId, id);
  }

  const [a] = await db
    .update(announcements)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenantId)))
    .returning();

  if (!a) throw new Error("Announcement not found");

  await writeAuditLog({
    tenantId, userId,
    action: "update",
    entityType: "announcement",
    entityId: id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return a;
}

function validateAnnouncement(input: UpdateInput): void {
  if (input.title !== undefined && !input.title.trim()) throw new Error("Title is required");
  if (input.content !== undefined && !input.content.trim()) throw new Error("Content is required");
  if (input.title !== undefined && input.title.length > 500) throw new Error("Title is too long");
}

export async function deleteAnnouncement(tenantId: string, id: string, userId: string) {
  await db
    .update(announcements)
    .set({ status: "deleted", updatedAt: new Date() })
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenantId)));

  await writeAuditLog({
    tenantId, userId,
    action: "delete",
    entityType: "announcement",
    entityId: id,
  });
}
