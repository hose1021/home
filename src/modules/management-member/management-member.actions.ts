"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createManagementMember, updateManagementMember} from "./management-member.service";

const memberInputSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  blockLabel: z.string().trim().min(1).max(100),
  position: z.string().trim().max(100).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const memberUpdateInputSchema = memberInputSchema.partial().extend({
  id: uuidSchema,
  isActive: z.boolean().optional(),
});

export async function createManagementMemberAction(input: z.input<typeof memberInputSchema>) {
  return runAction({
    permission: "settings:write",
    schema: memberInputSchema,
    errors: "errors",
    revalidate: ["/management-members"],
    handler: async ({session, tenantId}, data) => {
      await createManagementMember(tenantId, data, session.user.id);
      return {success: true};
    },
  }, input);
}

export async function updateManagementMemberAction(
  id: string,
  input: Omit<z.input<typeof memberUpdateInputSchema>, "id">,
) {
  return runAction({
    permission: "settings:write",
    schema: memberUpdateInputSchema,
    errors: "errors",
    revalidate: ["/management-members"],
    handler: async ({session, tenantId}, data) => {
      const {id, ...patch} = data;
      await updateManagementMember(tenantId, id, patch, session.user.id);
      return {success: true};
    },
  }, {id, ...input});
}
