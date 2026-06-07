"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/core/auth/session";
import { ensureTenantExists } from "@/core/multi-tenant";
import { createUnit, updateUnit, deleteUnit } from "./unit.service";
import { db } from "@/core/db";
import { buildings } from "@/core/db/schema/buildings";
import { eq } from "drizzle-orm";

export async function createUnitAction(slug: string, input: {
  unitNumber: string;
  entrance: number;
  floor: number;
  type: "residential" | "commercial" | "parking" | "storage" | "other";
  area: string;
}) {
  await requireAuth();
  const tenantId = await ensureTenantExists(slug);
  const [building] = await db.select().from(buildings).where(eq(buildings.tenantId, tenantId)).limit(1);
  if (!building) throw new Error("No building found. Create a building first.");

  await createUnit(tenantId, building.id, input);
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
  await requireAuth();
  const tenantId = await ensureTenantExists(slug);
  await updateUnit(tenantId, id, input);
  revalidatePath(`/${slug}/units`);
  return { success: true };
}

export async function deleteUnitAction(slug: string, id: string) {
  await requireAuth();
  const tenantId = await ensureTenantExists(slug);
  await deleteUnit(tenantId, id);
  revalidatePath(`/${slug}/units`);
  return { success: true };
}
