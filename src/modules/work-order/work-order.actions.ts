"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireTenantPermission} from "@/core/auth/session";
import {moneySchema, uuidSchema} from "@/core/validation/action-schemas";
import {createWorkOrder, updateWorkOrderStatus} from "./work-order.service";

const workOrderSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(4000).optional(),
  contractorId: uuidSchema.optional(),
  ticketId: uuidSchema.optional(),
  estimatedCost: moneySchema.optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function createWorkOrderAction(input: z.infer<typeof workOrderSchema>) {
  input = workOrderSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("work_order:write");
  await createWorkOrder(tenantId, {
    ...input,
    scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
  }, session.user.id);
  revalidatePath("/work-orders");
  return { success: true };
}

export async function updateWorkOrderStatusAction(id: string, status: "pending" | "approved" | "in_progress" | "completed" | "cancelled") {
  id = uuidSchema.parse(id);
  const { session, tenantId } = await requireTenantPermission("work_order:write");
  await updateWorkOrderStatus(tenantId, id, status, session.user.id);
  revalidatePath("/work-orders");
  return { success: true };
}
