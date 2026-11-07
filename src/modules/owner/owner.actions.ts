"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {assertPermission} from "@/core/auth/permissions";
import {ownerCreateSchema, ownerUpdateSchema, passwordSchema, unitInputSchema, uuidSchema} from "@/core/validation/action-schemas";
import {assignUnitToOwner, createAndAssignUnitToOwner, createOwnerWithUnit, deleteOwner, getUnassignedUnits, listOwnerOptions, removeUnitFromOwner, updateOwnerPassword, updateOwnerWithRoles} from "./owner.service";

const ownerUpdateInputSchema = ownerUpdateSchema.extend({id: uuidSchema});
const ownerIdInputSchema = uuidSchema;
const unitPairInputSchema = z.object({ownerId: uuidSchema, unitId: uuidSchema});
const newUnitInputSchema = unitInputSchema.extend({ownerId: uuidSchema});
const passwordInputSchema = z.object({id: uuidSchema, newPassword: passwordSchema});

export async function createOwnerAction(input: z.input<typeof ownerCreateSchema>) {
  return runAction({
    permission: "owner:write",
    schema: ownerCreateSchema,
    errors: "owner.errors",
    revalidate: ["/owners"],
    handler: async ({session, tenantId}, data) => {
      await createOwnerWithUnit(tenantId, data, session.user.id);
      return {success: true};
    },
  }, input);
}

export async function updateOwnerAction(id: string, input: z.input<typeof ownerUpdateSchema>) {
  return runAction({
    permission: "owner:write",
    schema: ownerUpdateInputSchema,
    errors: "owner.errors",
    revalidate: ["/owners"],
    // Role assignment is a privilege grant, so it needs the user-management permission on top of owner:write.
    authorize: ({session}, data) => {
      if (data.roles !== undefined) assertPermission(session, "user:manage");
    },
    handler: async ({session, tenantId}, data) => {
      const {id, ...patch} = data;
      await updateOwnerWithRoles(tenantId, id, patch, session.user.id);
      return {success: true};
    },
  }, {id, ...input});
}

export async function deleteOwnerAction(id: string) {
  return runAction({
    permission: "owner:write",
    schema: ownerIdInputSchema,
    errors: "owner.errors",
    revalidate: ["/owners"],
    handler: async ({session, tenantId}, ownerId) => {
      await deleteOwner(tenantId, ownerId, session.user.id);
      return {success: true};
    },
  }, id);
}

export async function updateOwnerPasswordAction(id: string, newPassword: string) {
  return runAction({
    permission: "user:manage",
    schema: passwordInputSchema,
    errors: "owner.errors",
    handler: async ({session, tenantId}, data) => {
      await updateOwnerPassword(tenantId, data.id, data.newPassword, session.user.id);
      return {success: true};
    },
  }, {id, newPassword});
}

export async function assignExistingUnitAction(ownerId: string, unitId: string) {
  return runAction({
    permission: "owner:write",
    schema: unitPairInputSchema,
    errors: "owner.errors",
    revalidate: ["/owners"],
    handler: async ({session, tenantId}, data) => {
      await assignUnitToOwner(tenantId, data.ownerId, data.unitId, session.user.id);
      return {success: true};
    },
  }, {ownerId, unitId});
}

export async function addNewUnitToOwnerAction(ownerId: string, input: z.input<typeof unitInputSchema>) {
  return runAction({
    permission: "owner:write",
    schema: newUnitInputSchema,
    errors: "owner.errors",
    revalidate: ["/owners"],
    handler: async ({session, tenantId}, data) => {
      const {ownerId, ...unit} = data;
      await createAndAssignUnitToOwner(tenantId, ownerId, unit, session.user.id);
      return {success: true};
    },
  }, {ownerId, ...input});
}

export async function listUnassignedUnitsAction(ownerId: string) {
  return runAction({
    permission: "owner:read",
    schema: ownerIdInputSchema,
    errors: "owner.errors",
    handler: ({tenantId}, id) => getUnassignedUnits(tenantId, id),
  }, ownerId);
}

export async function listOwnersAction() {
  return runAction({
    permission: "owner:read",
    schema: z.object({}),
    errors: "owner.errors",
    handler: ({tenantId}) => listOwnerOptions(tenantId),
  }, {});
}

export async function removeUnitFromOwnerAction(ownerId: string, unitId: string) {
  return runAction({
    permission: "owner:write",
    schema: unitPairInputSchema,
    errors: "owner.errors",
    revalidate: ["/owners"],
    handler: async ({session, tenantId}, data) => {
      await removeUnitFromOwner(tenantId, data.ownerId, data.unitId, session.user.id);
      return {success: true};
    },
  }, {ownerId, unitId});
}
