"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireTenantPermission} from "@/core/auth/session";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createManagementMember, updateManagementMember} from "./management-member.service";

const memberSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  blockLabel: z.string().trim().min(1).max(100),
  position: z.string().trim().max(100).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export async function createManagementMemberAction(input: z.infer<typeof memberSchema>) {
  input = memberSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("settings:write");
  await createManagementMember(tenantId, input, session.user.id);
  revalidatePath("/management-members");
  return { success: true };
}

export async function updateManagementMemberAction(
  id: string,
  input: Partial<z.infer<typeof memberSchema>> & { isActive?: boolean },
) {
  id = uuidSchema.parse(id);
  input = memberSchema.partial().extend({ isActive: z.boolean().optional() }).parse(input);
  const { session, tenantId } = await requireTenantPermission("settings:write");
  await updateManagementMember(tenantId, id, input, session.user.id);
  revalidatePath("/management-members");
  return { success: true };
}
