"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {createOwnerWithUnit, deleteOwner, updateOwnerWithRoles, updateOwnerPassword} from "./owner.service";
import type {Role} from "@/core/auth/permissions";

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
  const { session, tenantId } = await requireTenantPermission(slug, "owner:write");
  await createOwnerWithUnit(tenantId, input, session.user.id);
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
  const { session, tenantId } = await requireTenantPermission(slug, "owner:write");
  await updateOwnerWithRoles(tenantId, id, input, session.user.id);
  revalidatePath(`/${slug}/owners`);
  return { success: true };
}

export async function deleteOwnerAction(slug: string, id: string) {
  const { session, tenantId } = await requireTenantPermission(slug, "owner:write");
  await deleteOwner(tenantId, id, session.user.id);
  revalidatePath(`/${slug}/owners`);
  revalidatePath(`/${slug}/units`);
  return { success: true };
}

export async function updateOwnerPasswordAction(slug: string, id: string, newPassword: string) {
  const { session, tenantId } = await requireTenantPermission(slug, "user:manage");
  await updateOwnerPassword(tenantId, id, newPassword, session.user.id);
  return { success: true };
}
