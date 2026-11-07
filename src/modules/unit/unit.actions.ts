"use server";

import {type z} from "zod";
import {runAction} from "@/core/actions/action";
import {unitInputSchema, uuidSchema} from "@/core/validation/action-schemas";
import {createUnit, deleteUnit, updateUnit} from "./unit.service";

export async function createUnitAction(input: z.input<typeof unitInputSchema>) {
  return runAction({
    permission: "unit:write",
    schema: unitInputSchema,
    errors: "errors",
    revalidate: ["/units"],
    handler: async ({session, tenantId}, data) => {
      await createUnit(tenantId, data, session.user.id);
      return {success: true};
    },
  }, input);
}

const unitIdInputSchema = uuidSchema;
const unitUpdateInputSchema = unitInputSchema.partial().extend({id: unitIdInputSchema});

export async function updateUnitAction(id: string, input: Omit<z.input<typeof unitUpdateInputSchema>, "id">) {
  return runAction({
    permission: "unit:write",
    schema: unitUpdateInputSchema,
    errors: "errors",
    revalidate: ["/units"],
    handler: async ({session, tenantId}, data) => {
      const {id, ...patch} = data;
      await updateUnit(tenantId, id, patch, session.user.id);
      return {success: true};
    },
  }, {id, ...input});
}

export async function deleteUnitAction(id: string) {
  return runAction({
    permission: "unit:write",
    schema: unitIdInputSchema,
    errors: "errors",
    revalidate: ["/units"],
    handler: async ({session, tenantId}, unitId) => {
      await deleteUnit(tenantId, unitId, session.user.id);
      return {success: true};
    },
  }, id);
}
