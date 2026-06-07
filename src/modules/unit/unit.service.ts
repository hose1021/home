import { db } from "@/core/db";
import { units } from "@/core/db/schema/units";
import { eq, and } from "drizzle-orm";

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
}) {
  const [u] = await db.insert(units).values({
    tenantId, buildingId, ...input,
  }).returning();
  return u;
}

export async function updateUnit(tenantId: string, id: string, input: {
  unitNumber?: string;
  entrance?: number;
  floor?: number;
  type?: "residential" | "commercial" | "parking" | "storage" | "other";
  area?: string;
}) {
  const [u] = await db
    .update(units)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(units.id, id), eq(units.tenantId, tenantId)))
    .returning();
  return u;
}

export async function deleteUnit(tenantId: string, id: string) {
  await db
    .update(units)
    .set({ status: "deleted", updatedAt: new Date() })
    .where(and(eq(units.id, id), eq(units.tenantId, tenantId)));
}
