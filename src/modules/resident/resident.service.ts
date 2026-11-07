import {and, desc, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import type {ResidentType} from "@/core/db/schema/enums";
import {residents} from "@/core/db/schema/residents";
import {units} from "@/core/db/schema/units";
import {DomainError} from "@/core/errors/app-error";

export async function listResidents(tenantId: string) {
  return await db
    .select({
      id: residents.id,
      fullName: residents.fullName,
      idNumber: residents.idNumber,
      phone: residents.phone,
      residentType: residents.residentType,
      movedInAt: residents.movedInAt,
      movedOutAt: residents.movedOutAt,
      unitId: residents.unitId,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
    })
    .from(residents)
    .leftJoin(units, and(eq(units.id, residents.unitId), eq(units.tenantId, tenantId)))
    .where(eq(residents.tenantId, tenantId))
    .orderBy(desc(residents.movedInAt));
}

export async function createResident(
  tenantId: string,
  input: {
    unitId: string;
    fullName: string;
    idNumber?: string;
    phone?: string;
    residentType: ResidentType;
    movedInAt: string;
  },
  userId: string,
) {
  const [created] = await db.insert(residents).values({
    tenantId,
    unitId: input.unitId,
    fullName: input.fullName.trim(),
    idNumber: input.idNumber?.trim() || null,
    phone: input.phone?.trim() || null,
    residentType: input.residentType,
    movedInAt: input.movedInAt,
  }).returning();
  if (!created) throw new DomainError("residentCreateFailed");

  await writeAuditLog({
    tenantId, userId,
    action: "create",
    entityType: "resident",
    entityId: created.id,
    newValues: { fullName: created.fullName, unitId: created.unitId } as Record<string, unknown>,
  });
  return created;
}

export async function updateResident(
  tenantId: string,
  id: string,
  input: { movedOutAt?: string | null; phone?: string | null },
  userId: string,
) {
  const [existing] = await db
    .select()
    .from(residents)
    .where(and(eq(residents.id, id), eq(residents.tenantId, tenantId)))
    .limit(1);
  if (!existing) throw new DomainError("residentNotFound");

  const [updated] = await db.update(residents).set({
    movedOutAt: input.movedOutAt !== undefined ? input.movedOutAt || null : existing.movedOutAt,
    phone: input.phone !== undefined ? input.phone?.trim() || null : existing.phone,
  }).where(and(eq(residents.id, id), eq(residents.tenantId, tenantId))).returning();
  if (!updated) throw new DomainError("residentNotFound");

  await writeAuditLog({
    tenantId, userId,
    action: "update",
    entityType: "resident",
    entityId: id,
    oldValues: { movedOutAt: existing.movedOutAt } as Record<string, unknown>,
    newValues: { movedOutAt: updated.movedOutAt } as Record<string, unknown>,
  });
  return updated;
}
