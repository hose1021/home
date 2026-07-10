"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {createUnit, deleteUnit, updateUnit} from "./unit.service";
import {db} from "@/core/db";
import {buildings} from "@/core/db/schema/buildings";
import {eq} from "drizzle-orm";

export async function createUnitAction(slug: string, input: {
  unitNumber: string;
  entrance: number;
  floor: number;
  type: "residential" | "commercial" | "parking" | "storage" | "other";
  area: string;
}) {
  const { session, tenantId } = await requireTenantPermission(slug, "unit:write");
  const [building] = await db.select().from(buildings).where(eq(buildings.tenantId, tenantId)).limit(1);
  if (!building) throw new Error("No building found. Create a building first.");

  await createUnit(tenantId, building.id, input, session.user.id);
  revalidatePath(`/${slug}/units`);
  return { success: true };
}

export async function updateUnitAction(slug: string, id: string, input: {
  unitNumber?: string;
  entrance?: number;
  floor?: number;
  type?: "residential" | "commercial" | "parking" | "storage" | "other";
  area?: string;
}) {
  const { session, tenantId } = await requireTenantPermission(slug, "unit:write");
  await updateUnit(tenantId, id, input, session.user.id);
  revalidatePath(`/${slug}/units`);
  return { success: true };
}

export async function deleteUnitAction(slug: string, id: string) {
  const { session, tenantId } = await requireTenantPermission(slug, "unit:write");
  await deleteUnit(tenantId, id, session.user.id);
  revalidatePath(`/${slug}/units`);
  return { success: true };
}
