"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {RESIDENT_TYPES} from "@/core/db/schema/enums";
import {dateSchema, uuidSchema} from "@/core/validation/action-schemas";
import {createResident, updateResident} from "./resident.service";

const residentInputSchema = z.object({
  unitId: uuidSchema,
  fullName: z.string().trim().min(1).max(255),
  idNumber: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(50).optional(),
  residentType: z.enum(RESIDENT_TYPES),
  movedInAt: dateSchema,
});

const residentUpdateInputSchema = z.object({
  id: uuidSchema,
  movedOutAt: dateSchema.nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
});

export async function createResidentAction(input: z.input<typeof residentInputSchema>) {
  return runAction({
    permission: "resident:write",
    schema: residentInputSchema,
    errors: "errors",
    revalidate: ["/residents"],
    handler: async ({session, tenantId}, data) => {
      await createResident(tenantId, data, session.user.id);
      return {success: true};
    },
  }, input);
}

export async function updateResidentAction(
  id: string,
  input: Omit<z.input<typeof residentUpdateInputSchema>, "id">,
) {
  return runAction({
    permission: "resident:write",
    schema: residentUpdateInputSchema,
    errors: "errors",
    revalidate: ["/residents"],
    handler: async ({session, tenantId}, data) => {
      const {id, ...patch} = data;
      await updateResident(tenantId, id, patch, session.user.id);
      return {success: true};
    },
  }, {id, ...input});
}
