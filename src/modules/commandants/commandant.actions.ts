"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireTenantPermission} from "@/core/auth/session";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createCommandant, updateCommandant} from "./commandant.service";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const commandantSchema = z.object({
  ownerId: uuidSchema.nullable().optional(),
  fullName: z.string().trim().min(1).max(255),
  phone: z.string().trim().max(50).nullable().optional(),
  isActive: z.boolean(),
  startDate: dateSchema,
  endDate: dateSchema.nullable().optional(),
}).refine((value) => !value.endDate || value.endDate >= value.startDate, {
  message: "Конец периода раньше начала",
});

export async function createCommandantAction(input: z.infer<typeof commandantSchema>) {
  const validated = commandantSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("settings:write");
  await createCommandant(tenantId, validated, session.user.id);
  revalidatePath("/commandants");
  revalidatePath("/");
  return { success: true };
}

export async function updateCommandantAction(id: string, input: z.infer<typeof commandantSchema>) {
  id = uuidSchema.parse(id);
  const validated = commandantSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("settings:write");
  await updateCommandant(tenantId, id, validated, session.user.id);
  revalidatePath("/commandants");
  revalidatePath("/");
  return { success: true };
}
