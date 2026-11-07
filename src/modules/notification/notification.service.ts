import {and, desc, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {type NotificationChannel, type NotificationType} from "@/core/db/schema/enums";
import {notifications} from "@/core/db/schema/notifications";
import {users} from "@/core/db/schema/users";
import {DomainError} from "@/core/errors/app-error";

export async function listRecipientUsers(tenantId: string) {
  return await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
    .orderBy(users.fullName);
}

export async function listNotifications(tenantId: string, userId: string, limit = 100) {
  return await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.tenantId, tenantId), eq(notifications.userId, userId)))
    .orderBy(desc(notifications.sentAt))
    .limit(limit);
}

export async function createNotification(
  tenantId: string,
  input: { userId: string; type: NotificationType; title: string; body?: string; channel: NotificationChannel },
  actorId: string,
) {
  const [created] = await db.insert(notifications).values({
    tenantId,
    userId: input.userId,
    type: input.type,
    title: input.title.trim(),
    body: input.body?.trim() || null,
    channel: input.channel,
  }).returning();
  if (!created) throw new DomainError("notificationNotFound");

  await writeAuditLog({
    tenantId, userId: actorId,
    action: "create",
    entityType: "notification",
    entityId: created.id,
    newValues: { type: created.type, title: created.title } as Record<string, unknown>,
  });
  return created;
}

export async function markNotificationRead(tenantId: string, userId: string, id: string) {
  const [updated] = await db.update(notifications).set({
    isRead: true,
    readAt: new Date(),
  }).where(and(
    eq(notifications.id, id),
    eq(notifications.tenantId, tenantId),
    eq(notifications.userId, userId),
  )).returning();
  if (!updated) throw new DomainError("notificationNotFound");
  return updated;
}
