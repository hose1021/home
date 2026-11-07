import {and, desc, eq, ne} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {announcements} from "@/core/db/schema/announcements";
import type {AnnouncementPriority, AnnouncementStatus} from "@/core/db/schema/enums";
import {users} from "@/core/db/schema/users";
import {DomainError} from "@/core/errors/app-error";

type CreateInput = {
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  isPinned?: boolean;
  isDashboard?: boolean;
};

type UpdateInput = Partial<CreateInput> & {
  status?: AnnouncementStatus;
};

export type Announcement = typeof announcements.$inferSelect & { authorName: string | null };

export async function listAnnouncements(tenantId: string): Promise<Announcement[]> {
  return await db
    .select({
      id: announcements.id,
      tenantId: announcements.tenantId,
      createdBy: announcements.createdBy,
      title: announcements.title,
      content: announcements.content,
      priority: announcements.priority,
      isPinned: announcements.isPinned,
      isDashboard: announcements.isDashboard,
      status: announcements.status,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
      authorName: users.fullName,
    })
    .from(announcements)
    .leftJoin(users, eq(users.id, announcements.createdBy))
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

async function unflagOtherDashboard(tenantId: string, exceptId?: string) {
  const conditions = [eq(announcements.tenantId, tenantId), eq(announcements.isDashboard, true)];
  if (exceptId) {
    conditions.push(ne(announcements.id, exceptId));
  }
  await db
    .update(announcements)
    .set({isDashboard: false, updatedAt: new Date()})
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
  if (!a) throw new DomainError("announcement_not_found");

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
    .set({...input, updatedAt: new Date()})
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenantId)))
    .returning();

  if (!a) throw new DomainError("announcement_not_found");

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
  if (input.title !== undefined && !input.title.trim()) throw new DomainError("title_required");
  if (input.content !== undefined && !input.content.trim()) throw new DomainError("content_required");
  if (input.title !== undefined && input.title.length > 500) throw new DomainError("title_too_long");
}

export async function deleteAnnouncement(tenantId: string, id: string, userId: string) {
  await db
    .update(announcements)
    .set({status: "deleted", updatedAt: new Date()})
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenantId)));

  await writeAuditLog({
    tenantId, userId,
    action: "delete",
    entityType: "announcement",
    entityId: id,
  });
}
