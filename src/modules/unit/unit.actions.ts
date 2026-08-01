"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {createUnit, deleteUnit, listUnitsWithOwners, updateUnit} from "./unit.service";
import {db} from "@/core/db";
import {buildings} from "@/core/db/schema/buildings";
import {owners} from "@/core/db/schema/owners";
import {and, eq, ne} from "drizzle-orm";
import {unitInputSchema, uuidSchema} from "@/core/validation/action-schemas";

export async function createUnitAction(input: {
  unitNumber: string;
  entrance: number;
  floor: number;
  type: "residential" | "commercial" | "parking" | "storage" | "other";
  area: string;
}) {
  const validated = unitInputSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("unit:write");
  const [building] = await db.select().from(buildings).where(eq(buildings.tenantId, tenantId)).limit(1);
  if (!building) throw new Error("No building found. Create a building first.");

  await createUnit(tenantId, building.id, validated, session.user.id);
  revalidatePath("/units");
  return { success: true };
}

export async function updateUnitAction(id: string, input: {
  unitNumber?: string;
  entrance?: number;
  floor?: number;
  type?: "residential" | "commercial" | "parking" | "storage" | "other";
  area?: string;
}) {
  id = uuidSchema.parse(id);
  input = unitInputSchema.partial().parse(input);
  const { session, tenantId } = await requireTenantPermission("unit:write");
  await updateUnit(tenantId, id, input, session.user.id);
  revalidatePath("/units");
  return { success: true };
}

export async function deleteUnitAction(id: string) {
  const { session, tenantId } = await requireTenantPermission("unit:write");
  await deleteUnit(tenantId, id, session.user.id);
  revalidatePath("/units");
  return { success: true };
}

export async function listUnitsAction() {
  const { tenantId } = await requireTenantPermission("unit:read");
  return await listUnitsWithOwners(tenantId);
}

export async function listOwnersAction() {
  const { tenantId } = await requireTenantPermission("owner:read");
  const rows = await db
    .select({ id: owners.id, fullName: owners.fullName })
    .from(owners)
    .where(and(eq(owners.tenantId, tenantId), ne(owners.status, "deleted")))
    .orderBy(owners.fullName);
  return rows;
}
