"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {assignUnitToOwner, createAndAssignUnitToOwner, createOwnerWithUnit, deleteOwner, getUnassignedUnits, removeUnitFromOwner, updateOwnerPassword, updateOwnerWithRoles} from "./owner.service";
import type {Role} from "@/core/auth/permissions";
import {ownerCreateSchema, ownerUpdateSchema, unitInputSchema, uuidSchema} from "@/core/validation/action-schemas";
import {z} from "zod";

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
  const validated = ownerCreateSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("owner:write");
  await createOwnerWithUnit(tenantId, validated, session.user.id);
  revalidatePath("/owners");
  return { success: true };
}

export async function updateOwnerAction(id: string, input: {
  fullName?: string;
  phone?: string | null;
  username?: string;
  roles?: Role[];
}) {
  id = uuidSchema.parse(id);
  input = ownerUpdateSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("owner:write");
  await updateOwnerWithRoles(tenantId, id, input, session.user.id);
  revalidatePath("/owners");
  return { success: true };
}

export async function deleteOwnerAction(id: string) {
  id = uuidSchema.parse(id);
  const { session, tenantId } = await requireTenantPermission("owner:write");
  await deleteOwner(tenantId, id, session.user.id);
  revalidatePath("/owners");
  return { success: true };
}

export async function updateOwnerPasswordAction(id: string, newPassword: string) {
  id = uuidSchema.parse(id);
  newPassword = z.string().min(12).max(128).parse(newPassword);
  const { session, tenantId } = await requireTenantPermission("user:manage");
  await updateOwnerPassword(tenantId, id, newPassword, session.user.id);
  return { success: true };
}

export async function assignExistingUnitAction(ownerId: string, unitId: string) {
  ownerId = uuidSchema.parse(ownerId);
  unitId = uuidSchema.parse(unitId);
  const { session, tenantId } = await requireTenantPermission("owner:write");
  await assignUnitToOwner(tenantId, ownerId, unitId, session.user.id);
  revalidatePath("/owners");
  return { success: true };
}

export async function addNewUnitToOwnerAction(ownerId: string, input: {
  unitNumber: string;
  floor: number;
  entrance: number;
  type: "residential" | "commercial" | "parking" | "storage" | "other";
  area: string;
}) {
  ownerId = uuidSchema.parse(ownerId);
  input = unitInputSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("owner:write");
  await createAndAssignUnitToOwner(tenantId, ownerId, input, session.user.id);
  revalidatePath("/owners");
  return { success: true };
}

export async function listUnassignedUnitsAction(ownerId: string) {
  ownerId = uuidSchema.parse(ownerId);
  const { tenantId } = await requireTenantPermission("owner:read");
  return await getUnassignedUnits(tenantId, ownerId);
}

export async function removeUnitFromOwnerAction(ownerId: string, unitId: string) {
  ownerId = uuidSchema.parse(ownerId);
  unitId = uuidSchema.parse(unitId);
  const { session, tenantId } = await requireTenantPermission("owner:write");
  await removeUnitFromOwner(tenantId, ownerId, unitId, session.user.id);
  revalidatePath("/owners");
  return { success: true };
}
