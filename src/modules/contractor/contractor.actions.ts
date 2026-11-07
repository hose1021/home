"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {CONTRACTOR_STATUSES} from "@/core/db/schema/enums";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createContractor, updateContractor} from "./contractor.service";

const contractorInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  contactPerson: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
  taxId: z.string().trim().max(20).optional(),
  specialties: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  status: z.enum(CONTRACTOR_STATUSES).default("active"),
});

const contractorUpdateInputSchema = contractorInputSchema.partial().extend({id: uuidSchema});

export async function createContractorAction(input: z.input<typeof contractorInputSchema>) {
  return runAction({
    permission: "contractor:write",
    schema: contractorInputSchema,
    errors: "errors",
    revalidate: ["/contractors"],
    handler: async ({session, tenantId}, data) => {
      await createContractor(tenantId, data, session.user.id);
      return {success: true};
    },
  }, input);
}

export async function updateContractorAction(
  id: string,
  input: Omit<z.input<typeof contractorUpdateInputSchema>, "id">,
) {
  return runAction({
    permission: "contractor:write",
    schema: contractorUpdateInputSchema,
    errors: "errors",
    revalidate: ["/contractors"],
    handler: async ({session, tenantId}, data) => {
      const {id, ...patch} = data;
      await updateContractor(tenantId, id, patch, session.user.id);
      return {success: true};
    },
  }, {id, ...input});
}
