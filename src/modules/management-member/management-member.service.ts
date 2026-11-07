import {and, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {managementMembers} from "@/core/db/schema/management-members";
import {DomainError} from "@/core/errors/app-error";

export async function listManagementMembers(tenantId: string) {
  return await db
    .select()
    .from(managementMembers)
    .where(and(eq(managementMembers.tenantId, tenantId), eq(managementMembers.isActive, true)))
    .orderBy(managementMembers.sortOrder);
}

export async function createManagementMember(
  tenantId: string,
  input: { fullName: string; blockLabel: string; position?: string; sortOrder?: number },
  userId: string,
) {
  const [created] = await db.insert(managementMembers).values({
    tenantId,
    fullName: input.fullName.trim(),
    blockLabel: input.blockLabel.trim(),
    position: input.position?.trim() || null,
    sortOrder: input.sortOrder ?? 0,
  }).returning();
  if (!created) throw new DomainError("managementMemberCreateFailed");

  await writeAuditLog({
    tenantId, userId,
    action: "create",
    entityType: "management_member",
    entityId: created.id,
    newValues: { fullName: created.fullName, blockLabel: created.blockLabel } as Record<string, unknown>,
  });
  return created;
}

export async function updateManagementMember(
  tenantId: string,
  id: string,
  input: { fullName?: string; blockLabel?: string; position?: string | null; sortOrder?: number; isActive?: boolean },
  userId: string,
) {
  const [existing] = await db
    .select()
    .from(managementMembers)
    .where(and(eq(managementMembers.id, id), eq(managementMembers.tenantId, tenantId)))
    .limit(1);
  if (!existing) throw new DomainError("managementMemberNotFound");

  const [updated] = await db.update(managementMembers).set({
    fullName: input.fullName?.trim() ?? existing.fullName,
    blockLabel: input.blockLabel?.trim() ?? existing.blockLabel,
    position: input.position !== undefined ? (input.position?.trim() || null) : existing.position,
    sortOrder: input.sortOrder ?? existing.sortOrder,
    isActive: input.isActive ?? existing.isActive,
    updatedAt: new Date(),
  }).where(and(eq(managementMembers.id, id), eq(managementMembers.tenantId, tenantId))).returning();
  if (!updated) throw new DomainError("managementMemberNotFound");

  await writeAuditLog({
    tenantId, userId,
    action: "update",
    entityType: "management_member",
    entityId: id,
    oldValues: { fullName: existing.fullName } as Record<string, unknown>,
    newValues: { fullName: updated.fullName } as Record<string, unknown>,
  });
  return updated;
}
