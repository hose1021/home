"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {createOwnerWithUnit, deleteOwner, updateOwnerPassword, updateOwnerWithRoles} from "./owner.service";
import type {Role} from "@/core/auth/permissions";

export async function createOwnerAction(input: {
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
  const { session, tenantId } = await requireTenantPermission("owner:write");
  await createOwnerWithUnit(tenantId, input, session.user.id);
  revalidatePath("/owners");
  return { success: true };
}

export async function updateOwnerAction(id: string, input: {
  fullName?: string;
  phone?: string | null;
  username?: string;
  roles?: Role[];
}) {
  const { session, tenantId } = await requireTenantPermission("owner:write");
  await updateOwnerWithRoles(tenantId, id, input, session.user.id);
  revalidatePath("/owners");
  return { success: true };
}

export async function deleteOwnerAction(id: string) {
  const { session, tenantId } = await requireTenantPermission("owner:write");
  await deleteOwner(tenantId, id, session.user.id);
  revalidatePath("/owners");
  return { success: true };
}

export async function updateOwnerPasswordAction(id: string, newPassword: string) {
  const { session, tenantId } = await requireTenantPermission("user:manage");
  await updateOwnerPassword(tenantId, id, newPassword, session.user.id);
  return { success: true };
}
