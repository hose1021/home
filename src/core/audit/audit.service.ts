import { db } from "@/core/db";
import { auditLogs } from "@/core/db/schema/audit-logs";

interface AuditEntry {
  tenantId: string;
  userId: string;
  action: "create" | "update" | "delete" | "restore" | "login" | "export";
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function writeAuditLog(entry: AuditEntry) {
  await db.insert(auditLogs).values({
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
