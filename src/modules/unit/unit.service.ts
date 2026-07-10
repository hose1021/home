import {db} from "@/core/db";
import {units} from "@/core/db/schema/units";
import {and, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";

export async function getUnitById(tenantId: string, id: string) {
  const [u] = await db
    .select()
    .from(units)
    .where(and(eq(units.id, id), eq(units.tenantId, tenantId)))
    .limit(1);
  return u ?? null;
}

export async function listUnits(tenantId: string) {
  return await db
    .select()
    .from(units)
    .where(eq(units.tenantId, tenantId))
    .orderBy(units.unitNumber);
}

export async function createUnit(tenantId: string, buildingId: string, input: {
  unitNumber: string;
  entrance: number;
  floor: number;
  type: "residential" | "commercial" | "parking" | "storage" | "other";
  area: string;
}, userId: string) {
  const [u] = await db.insert(units).values({
    tenantId, buildingId, ...input,
  }).returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "unit",
    entityId: u.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return u;
}

export async function updateUnit(tenantId: string, id: string, input: {
  unitNumber?: string;
  entrance?: number;
  floor?: number;
  type?: "residential" | "commercial" | "parking" | "storage" | "other";
  area?: string;
}, userId: string) {
  const [existing] = await db
    .select()
    .from(units)
    .where(and(eq(units.id, id), eq(units.tenantId, tenantId)))
    .limit(1);
  if (!existing) return null;

  const [u] = await db
    .update(units)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(units.id, id), eq(units.tenantId, tenantId)))
    .returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "unit",
    entityId: id,
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: input as unknown as Record<string, unknown>,
  });

  return u;
}

export async function deleteUnit(tenantId: string, id: string, userId: string) {
  const [existing] = await db
    .select()
    .from(units)
    .where(and(eq(units.id, id), eq(units.tenantId, tenantId)))
    .limit(1);
  if (!existing) return;

  await db
    .update(units)
    .set({ status: "deleted", updatedAt: new Date() })
    .where(and(eq(units.id, id), eq(units.tenantId, tenantId)));

  await writeAuditLog({
    tenantId,
    userId,
    action: "delete",
    entityType: "unit",
    entityId: id,
    oldValues: { unitNumber: existing.unitNumber } as Record<string, unknown>,
  });
}
