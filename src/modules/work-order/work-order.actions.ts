"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {WORK_ORDER_STATUSES} from "@/core/db/schema/enums";
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

const workOrderStatusSchema = z.object({
  id: uuidSchema,
  status: z.enum(WORK_ORDER_STATUSES),
});

export async function createWorkOrderAction(input: z.input<typeof workOrderSchema>) {
  return runAction({
    permission: "work_order:write",
    schema: workOrderSchema,
    errors: "errors",
    revalidate: ["/work-orders"],
    handler: async ({session, tenantId}, data) => {
      await createWorkOrder(tenantId, {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
      }, session.user.id);
      return {success: true};
    },
  }, input);
}

export async function updateWorkOrderStatusAction(id: string, status: (typeof WORK_ORDER_STATUSES)[number]) {
  return runAction({
    permission: "work_order:write",
    schema: workOrderStatusSchema,
    errors: "errors",
    revalidate: ["/work-orders"],
    handler: async ({session, tenantId}, data) => {
      await updateWorkOrderStatus(tenantId, data.id, data.status, session.user.id);
      return {success: true};
    },
  }, {id, status});
}
