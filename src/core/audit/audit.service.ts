import {desc, eq} from "drizzle-orm";
import {db} from "@/core/db";
import {auditLogs} from "@/core/db/schema/audit-logs";
import type {AuditAction, AuditEntityType} from "@/core/db/schema/enums";
import {users} from "@/core/db/schema/users";

/** Transaction handle accepted by every service that writes audit rows. */
export type AuditExecutor = Pick<typeof db, "insert">;

interface AuditEntry {
  tenantId: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function writeAuditLog(entry: AuditEntry, executor: AuditExecutor = db) {
  await executor.insert(auditLogs).values({
    tenantId: entry.tenantId,
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    oldValues: entry.oldValues ?? null,
    newValues: entry.newValues ?? null,
    ipAddress: entry.ipAddress ?? null,
  });
}

/** Newest first, with the author name; the audit page and the report share this query. */
export async function listAuditLogs(tenantId: string, limit = 50) {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      createdAt: auditLogs.createdAt,
      userName: users.fullName,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
