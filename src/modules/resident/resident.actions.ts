"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireTenantPermission} from "@/core/auth/session";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createResident, updateResident} from "./resident.service";

const residentSchema = z.object({
  unitId: uuidSchema,
  fullName: z.string().trim().min(1).max(255),
  idNumber: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(50).optional(),
  residentType: z.enum(["owner", "family", "tenant", "guest"]),
  movedInAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createResidentAction(input: z.infer<typeof residentSchema>) {
  input = residentSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("resident:write");
  await createResident(tenantId, input, session.user.id);
  revalidatePath("/residents");
  return { success: true };
}

export async function updateResidentAction(
  id: string,
  input: { movedOutAt?: string | null; phone?: string | null },
) {
  id = uuidSchema.parse(id);
  input = z.object({
    movedOutAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    phone: z.string().trim().max(50).nullable().optional(),
  }).parse(input);
  const { session, tenantId } = await requireTenantPermission("resident:write");
  await updateResident(tenantId, id, input, session.user.id);
  revalidatePath("/residents");
  return { success: true };
}
