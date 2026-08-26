import {and, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {contractors} from "@/core/db/schema/contractors";

export type ContractorStatus = "invited" | "active" | "suspended" | "terminated";

export async function listContractors(tenantId: string) {
  return await db
    .select()
    .from(contractors)
    .where(eq(contractors.tenantId, tenantId))
    .orderBy(contractors.name);
}

export async function createContractor(
  tenantId: string,
  input: {
    name: string;
    contactPerson?: string;
    phone?: string;
    taxId?: string;
    specialties?: string[];
    status: ContractorStatus;
  },
  userId: string,
) {
  const [created] = await db.insert(contractors).values({
    tenantId,
    name: input.name.trim(),
    contactPerson: input.contactPerson?.trim() || null,
    phone: input.phone?.trim() || null,
    taxId: input.taxId?.trim() || null,
    specialties: input.specialties?.length ? input.specialties : null,
    status: input.status,
  }).returning();
  if (!created) throw new Error("Failed to create contractor");

  await writeAuditLog({
    tenantId, userId,
    action: "create",
    entityType: "contractor",
    entityId: created.id,
    newValues: { name: created.name, status: created.status } as Record<string, unknown>,
  });
  return created;
}

export async function updateContractor(
  tenantId: string,
  id: string,
  input: {
    name?: string;
    contactPerson?: string | null;
    phone?: string | null;
    taxId?: string | null;
    specialties?: string[];
    status?: ContractorStatus;
  },
  userId: string,
) {
  const [existing] = await db
    .select()
    .from(contractors)
    .where(and(eq(contractors.id, id), eq(contractors.tenantId, tenantId)))
    .limit(1);
  if (!existing) throw new Error("Подрядчик не найден");

  const [updated] = await db.update(contractors).set({
    name: input.name?.trim() ?? existing.name,
    contactPerson: input.contactPerson !== undefined ? input.contactPerson?.trim() || null : existing.contactPerson,
    phone: input.phone !== undefined ? input.phone?.trim() || null : existing.phone,
    taxId: input.taxId !== undefined ? input.taxId?.trim() || null : existing.taxId,
    specialties: input.specialties !== undefined ? (input.specialties.length ? input.specialties : null) : existing.specialties,
    status: input.status ?? existing.status,
  }).where(and(eq(contractors.id, id), eq(contractors.tenantId, tenantId))).returning();
  if (!updated) throw new Error("Подрядчик не найден");

  await writeAuditLog({
    tenantId, userId,
    action: "update",
    entityType: "contractor",
    entityId: id,
    oldValues: { name: existing.name, status: existing.status } as Record<string, unknown>,
    newValues: { name: updated.name, status: updated.status } as Record<string, unknown>,
  });
  return updated;
}
