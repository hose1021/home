"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {uuidSchema} from "@/core/validation/action-schemas";
import {refundPayment, requireOwnerPaymentAccess} from "@/modules/finance/services/payment.service";

const refundSchema = z.object({ownerId: uuidSchema, paymentId: uuidSchema});

export async function refundPaymentAction(ownerId: string, paymentId: string) {
  return runAction({
    permission: "payment:write",
    schema: refundSchema,
    errors: "payments.errors",
    authorize: async ({tenantId, session}, data) => {
      await requireOwnerPaymentAccess(tenantId, data.ownerId, session.user.id, session.user.roles);
    },
    revalidate: (_data: {ownerId: string; paymentId: string}, result: {ownerId: string}) => ["/finance/payments", `/owners/${result.ownerId}`],
    handler: async ({tenantId, session}, data) => {
      const payment = await refundPayment(tenantId, data.paymentId, session.user.id);
      return {success: true, payment, ownerId: data.ownerId};
    },
  }, {ownerId, paymentId});
}
