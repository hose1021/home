"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {dateSchema, uuidSchema} from "@/core/validation/action-schemas";
import {createCommandant, updateCommandant} from "./commandant.service";

const commandantFields = z.object({
  ownerId: uuidSchema.nullable().optional(),
  fullName: z.string().trim().min(1).max(255),
  phone: z.string().trim().max(50).nullable().optional(),
  isActive: z.boolean(),
  startDate: dateSchema,
  endDate: dateSchema.nullable().optional(),
});

const commandantInputSchema = commandantFields.refine(
  (value) => !value.endDate || value.endDate >= value.startDate,
  {message: "End date must not be before the start date"},
);

const commandantUpdateInputSchema = commandantFields.extend({id: uuidSchema}).refine(
  (value) => !value.endDate || value.endDate >= value.startDate,
  {message: "End date must not be before the start date"},
);

export async function createCommandantAction(input: z.input<typeof commandantInputSchema>) {
  return runAction({
    permission: "settings:write",
    schema: commandantInputSchema,
    errors: "commandants.errors",
    revalidate: ["/commandants", "/"],
    handler: async ({session, tenantId}, data) => {
      await createCommandant(tenantId, data, session.user.id);
      return {success: true};
    },
  }, input);
}

export async function updateCommandantAction(id: string, input: z.input<typeof commandantInputSchema>) {
  return runAction({
    permission: "settings:write",
    schema: commandantUpdateInputSchema,
    errors: "commandants.errors",
    revalidate: ["/commandants", "/"],
    handler: async ({session, tenantId}, data) => {
      const {id, ...patch} = data;
      await updateCommandant(tenantId, id, patch, session.user.id);
      return {success: true};
    },
  }, {id, ...input});
}
