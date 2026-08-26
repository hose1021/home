"use server";

import {revalidatePath} from "next/cache";
import {getTranslations} from "next-intl/server";
import {requireTenantPermission} from "@/core/auth/session";
import {ownerBelongsToUser, PaymentError, refundPayment} from "@/modules/finance/services/payment.service";
import {hasStaffRole} from "@/core/auth/permissions";
import {ForbiddenError} from "@/core/errors/app-error";
import {uuidSchema} from "@/core/validation/action-schemas";

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

async function requireOwnerPaymentAccess(
  tenantId: string,
  ownerId: string,
  userId: string,
  roles: Parameters<typeof hasStaffRole>[0],
): Promise<void> {
  if (hasStaffRole(roles)) return;
  if (!await ownerBelongsToUser(tenantId, ownerId, userId)) {
    throw new ForbiddenError("You can only manage your own payments");
  }
}
