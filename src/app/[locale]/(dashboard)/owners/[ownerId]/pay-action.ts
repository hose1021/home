"use server";

import {revalidatePath} from "next/cache";
import {getTranslations} from "next-intl/server";
import {requireTenantPermission} from "@/core/auth/session";
import {uuidSchema} from "@/core/validation/action-schemas";
import {PaymentError, refundPayment, requireOwnerPaymentAccess} from "@/modules/finance/services/payment.service";

export async function refundPaymentAction(ownerId: string, paymentId: string) {
  const t = await getTranslations("payments.errors");
  ownerId = uuidSchema.parse(ownerId);
  paymentId = uuidSchema.parse(paymentId);
  const { session, tenantId } = await requireTenantPermission("payment:write");
  await requireOwnerPaymentAccess(tenantId, ownerId, session.user.id, session.user.roles);
  try {
    const payment = await refundPayment(tenantId, paymentId, session.user.id);
    revalidatePath(`/owners/${ownerId}`);
    return { success: true, payment };
  } catch (err) {
    if (err instanceof PaymentError) throw new Error(t(err.code));
    throw err;
  }
}
