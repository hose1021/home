"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireTenantPermission} from "@/core/auth/session";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createContractor, updateContractor} from "./contractor.service";

const contractorSchema = z.object({
  name: z.string().trim().min(1).max(255),
  contactPerson: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
  taxId: z.string().trim().max(20).optional(),
  specialties: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  status: z.enum(["invited", "active", "suspended", "terminated"]).default("active"),
});

export async function createContractorAction(input: z.infer<typeof contractorSchema>) {
  input = contractorSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("contractor:write");
  await createContractor(tenantId, input, session.user.id);
  revalidatePath("/contractors");
  return { success: true };
}

export async function updateContractorAction(
  id: string,
  input: Partial<z.infer<typeof contractorSchema>>,
) {
  id = uuidSchema.parse(id);
  input = contractorSchema.partial().parse(input);
  const { session, tenantId } = await requireTenantPermission("contractor:write");
  await updateContractor(tenantId, id, input, session.user.id);
  revalidatePath("/contractors");
  return { success: true };
}
