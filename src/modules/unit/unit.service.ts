import {and, eq, ne, sql} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {owners, ownerships} from "@/core/db/schema/owners";
import {units} from "@/core/db/schema/units";

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
    .orderBy(units.unitNumber)
    .limit(1000);
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
  if (!u) throw new Error("Failed to create unit");

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

export async function listUnitsWithOwners(tenantId: string) {
  return await db
    .select({
      id: units.id,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
      type: units.type,
      area: units.area,
      status: units.status,
      ownerIds: sql<string[]>`coalesce(array_agg(distinct ${owners.id}) filter (where ${owners.id} is not null), '{}')`,
      ownerNames: sql<string[]>`coalesce(array_agg(distinct ${owners.fullName}) filter (where ${owners.fullName} is not null), '{}')`,
      ownerCount: sql<number>`coalesce(count(distinct ${owners.id}) filter (where ${owners.id} is not null), 0)::int`,
    })
    .from(units)
    .leftJoin(ownerships, and(
      eq(ownerships.unitId, units.id),
      eq(ownerships.tenantId, tenantId),
    ))
    .leftJoin(owners, and(
      eq(owners.id, ownerships.ownerId),
      ne(owners.status, "deleted"),
    ))
    .where(and(eq(units.tenantId, tenantId), ne(units.status, "deleted")))
    .groupBy(units.id)
    .orderBy(units.entrance, units.floor, units.unitNumber);
}
