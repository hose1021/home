"use server";

import {revalidatePath} from "next/cache";
import {and, eq} from "drizzle-orm";
import {requireTenantPermission} from "@/core/auth/session";
import {db} from "@/core/db";
import {payments} from "@/core/db/schema/payments";
import {writeAuditLog} from "@/core/audit/audit.service";
import {ownerBelongsToUser, registerPayment, validatePaymentValues} from "@/modules/finance/services/payment.service";
import {hasStaffRole} from "@/core/auth/permissions";
import {ForbiddenError} from "@/core/errors/app-error";

export async function payForUnitAction(
  ownerId: string,
  unitId: string,
  amount: string,
  periodYear: number,
  periodMonth: number,
  paymentMethod: "cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal",
  referenceNo: string | undefined,
  tariffPerSqm: string,
) {
  const { session, tenantId } = await requireTenantPermission("payment:write");
  await requireOwnerPaymentAccess(tenantId, ownerId, session.user.id, session.user.roles);

  const payment = await registerPayment(tenantId, {
    unitId,
    ownerId,
    amount,
    tariffPerSqm,
    periodYear,
    periodMonth,
    paymentMethod,
    referenceNo,
  }, session.user.id);

  revalidatePath(`/owners/${ownerId}`);
  return { success: true, payment };
}

export async function editPaymentAction(
  ownerId: string,
  paymentId: string,
  data: {
    amount: string;
    periodYear: number;
    periodMonth: number;
    paymentMethod: string;
    referenceNo?: string;
    tariffPerSqm: string;
    notes?: string;
  },
) {
  const { session, tenantId } = await requireTenantPermission("payment:write");
  await requireOwnerPaymentAccess(tenantId, ownerId, session.user.id, session.user.roles);
  validatePaymentValues(data);

  const [existing] = await db
    .select()
    .from(payments)
    .where(and(
      eq(payments.id, paymentId),
      eq(payments.tenantId, tenantId),
      eq(payments.ownerId, ownerId),
    ))
    .limit(1);

  if (!existing) throw new Error("Платёж не найден");

  const [updated] = await db
    .update(payments)
    .set({
      amount: data.amount,
      periodYear: data.periodYear,
      periodMonth: data.periodMonth,
      paymentMethod: data.paymentMethod as "cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal" | "other",
      referenceNo: data.referenceNo ?? null,
      tariffPerSqm: data.tariffPerSqm,
      notes: data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(payments.id, paymentId),
      eq(payments.tenantId, tenantId),
      eq(payments.ownerId, ownerId),
    ))
    .returning();

  await writeAuditLog({
    tenantId,
    userId: session.user.id,
    action: "update",
    entityType: "payment",
    entityId: paymentId,
    oldValues: { amount: existing.amount, periodYear: existing.periodYear, periodMonth: existing.periodMonth, paymentMethod: existing.paymentMethod, tariffPerSqm: existing.tariffPerSqm },
    newValues: data,
  });

  revalidatePath(`/owners/${ownerId}`);
  return { success: true, payment: updated };
}

export async function deletePaymentAction(
  ownerId: string,
  paymentId: string,
) {
  const { session, tenantId } = await requireTenantPermission("payment:write");
  await requireOwnerPaymentAccess(tenantId, ownerId, session.user.id, session.user.roles);

  const [existing] = await db
    .select()
    .from(payments)
    .where(and(
      eq(payments.id, paymentId),
      eq(payments.tenantId, tenantId),
      eq(payments.ownerId, ownerId),
    ))
    .limit(1);

  if (!existing) throw new Error("Платёж не найден");

  await db.delete(payments).where(and(
    eq(payments.id, paymentId),
    eq(payments.tenantId, tenantId),
    eq(payments.ownerId, ownerId),
  ));

  await writeAuditLog({
    tenantId,
    userId: session.user.id,
    action: "delete",
    entityType: "payment",
    entityId: paymentId,
    oldValues: { amount: existing.amount, periodYear: existing.periodYear, periodMonth: existing.periodMonth },
  });

  revalidatePath(`/owners/${ownerId}`);
  return { success: true };
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
