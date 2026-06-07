import {db} from "@/core/db";
import {announcements} from "@/core/db/schema/announcements";
import {and, desc, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";

type CreateInput = {
  title: string;
  content: string;
  priority?: "low" | "normal" | "high" | "urgent";
  isPinned?: boolean;
};

type UpdateInput = Partial<CreateInput> & {
  status?: "active" | "archived";
};

export async function listAnnouncements(tenantId: string) {
  return await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.tenantId, tenantId), eq(announcements.status, "active")))
    .orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
}

export async function getAnnouncementById(tenantId: string, id: string) {
  const [a] = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenantId)))
    .limit(1);
  return a ?? null;
}

export async function createAnnouncement(tenantId: string, userId: string, input: CreateInput) {
  const [a] = await db.insert(announcements).values({
    tenantId,
    createdBy: userId,
    title: input.title,
    content: input.content,
    priority: input.priority ?? "normal",
    isPinned: input.isPinned ?? false,
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
  const [a] = await db
    .update(announcements)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenantId)))
    .returning();

  await writeAuditLog({
    tenantId, userId,
    action: "update",
    entityType: "announcement",
    entityId: id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return a;
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
