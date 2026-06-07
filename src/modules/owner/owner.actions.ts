"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/core/auth/session";
import { ensureTenantExists } from "@/core/multi-tenant";
import { createOwnerWithUnit, updateOwnerWithRoles, deleteOwner } from "./owner.service";
import type { Role } from "@/core/auth/permissions";

export async function createOwnerAction(slug: string, input: {
  fullName: string;
  phone?: string;
  username: string;
  password: string;
  unitNumber: string;
  floor: number;
  entrance: number;
  type: "residential" | "commercial" | "parking" | "storage" | "other";
  area: string;
}) {
  await requireAuth();
  const tenantId = await ensureTenantExists(slug);
  await createOwnerWithUnit(tenantId, input);
  revalidatePath(`/${slug}/owners`);
  revalidatePath(`/${slug}/units`);
  return { success: true };
}

export async function updateOwnerAction(slug: string, id: string, input: {
  fullName?: string;
  phone?: string | null;
  username?: string;
  roles?: Role[];
}) {
  await requireAuth();
  const tenantId = await ensureTenantExists(slug);
  await updateOwnerWithRoles(tenantId, id, input);
  revalidatePath(`/${slug}/owners`);
  return { success: true };
}

export async function deleteOwnerAction(slug: string, id: string) {
  await requireAuth();
  const tenantId = await ensureTenantExists(slug);
  await deleteOwner(tenantId, id);
  revalidatePath(`/${slug}/owners`);
  revalidatePath(`/${slug}/units`);
  return { success: true };
}
