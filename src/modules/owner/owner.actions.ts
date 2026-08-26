"use server";

import {revalidatePath} from "next/cache";
import {getTranslations} from "next-intl/server";
import {z} from "zod";
import type {Role} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {translateDomainError} from "@/core/errors/app-error";
import {ownerCreateSchema, ownerUpdateSchema, unitInputSchema, uuidSchema} from "@/core/validation/action-schemas";
import {assignUnitToOwner, createAndAssignUnitToOwner, createOwnerWithUnit, deleteOwner, getUnassignedUnits, removeUnitFromOwner, updateOwnerPassword, updateOwnerWithRoles} from "./owner.service";

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
  const t = await getTranslations("owner.errors");
  const validated = ownerCreateSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("owner:write");
  try {
    await createOwnerWithUnit(tenantId, validated, session.user.id);
  } catch (err) {
    translateDomainError(err, t);
  }
  revalidatePath("/owners");
  return { success: true };
}

export async function updateOwnerAction(id: string, input: {
  fullName?: string;
  phone?: string | null;
  username?: string;
  roles?: Role[];
}) {
  const t = await getTranslations("owner.errors");
  id = uuidSchema.parse(id);
  input = ownerUpdateSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("owner:write");
  try {
    await updateOwnerWithRoles(tenantId, id, input, session.user.id);
  } catch (err) {
    translateDomainError(err, t);
  }
  revalidatePath("/owners");
  return { success: true };
}

export async function deleteOwnerAction(id: string) {
  const t = await getTranslations("owner.errors");
  id = uuidSchema.parse(id);
  const { session, tenantId } = await requireTenantPermission("owner:write");
  try {
    await deleteOwner(tenantId, id, session.user.id);
  } catch (err) {
    translateDomainError(err, t);
  }
  revalidatePath("/owners");
  return { success: true };
}

export async function updateOwnerPasswordAction(id: string, newPassword: string) {
  const t = await getTranslations("owner.errors");
  id = uuidSchema.parse(id);
  newPassword = z.string().min(12).max(128).parse(newPassword);
  const { session, tenantId } = await requireTenantPermission("user:manage");
  try {
    await updateOwnerPassword(tenantId, id, newPassword, session.user.id);
  } catch (err) {
    translateDomainError(err, t);
  }
  return { success: true };
}

export async function assignExistingUnitAction(ownerId: string, unitId: string) {
  const t = await getTranslations("owner.errors");
  ownerId = uuidSchema.parse(ownerId);
  unitId = uuidSchema.parse(unitId);
  const { session, tenantId } = await requireTenantPermission("owner:write");
  try {
    await assignUnitToOwner(tenantId, ownerId, unitId, session.user.id);
  } catch (err) {
    translateDomainError(err, t);
  }
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
  const t = await getTranslations("owner.errors");
  ownerId = uuidSchema.parse(ownerId);
  input = unitInputSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("owner:write");
  try {
    await createAndAssignUnitToOwner(tenantId, ownerId, input, session.user.id);
  } catch (err) {
    translateDomainError(err, t);
  }
  revalidatePath("/owners");
  return { success: true };
}

export async function listUnassignedUnitsAction(ownerId: string) {
  ownerId = uuidSchema.parse(ownerId);
  const { tenantId } = await requireTenantPermission("owner:read");
  return await getUnassignedUnits(tenantId, ownerId);
}

export async function removeUnitFromOwnerAction(ownerId: string, unitId: string) {
  const t = await getTranslations("owner.errors");
  ownerId = uuidSchema.parse(ownerId);
  unitId = uuidSchema.parse(unitId);
  const { session, tenantId } = await requireTenantPermission("owner:write");
  try {
    await removeUnitFromOwner(tenantId, ownerId, unitId, session.user.id);
  } catch (err) {
    translateDomainError(err, t);
  }
  revalidatePath("/owners");
  return { success: true };
}
