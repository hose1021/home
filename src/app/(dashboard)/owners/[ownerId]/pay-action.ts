"use server";

import {revalidatePath} from "next/cache";
import {and, eq} from "drizzle-orm";
import {requireTenantPermission} from "@/core/auth/session";
import {db} from "@/core/db";
import {payments} from "@/core/db/schema/payments";
import {writeAuditLog} from "@/core/audit/audit.service";
import {ownerBelongsToUser, refundPayment, registerPayment, validatePaymentValues} from "@/modules/finance/services/payment.service";
import {hasStaffRole} from "@/core/auth/permissions";
import {ForbiddenError} from "@/core/errors/app-error";
import {paymentInputSchema, uuidSchema} from "@/core/validation/action-schemas";
import {z} from "zod";

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
  ownerId = uuidSchema.parse(ownerId);
  unitId = uuidSchema.parse(unitId);
  const validated = paymentInputSchema.parse({ unitId, ownerId, amount, periodYear, periodMonth, paymentMethod, referenceNo, tariffPerSqm });
  const { session, tenantId } = await requireTenantPermission("payment:write");
  await requireOwnerPaymentAccess(tenantId, ownerId, session.user.id, session.user.roles);

  const payment = await registerPayment(tenantId, {
    unitId: validated.unitId,
    ownerId: validated.ownerId,
    amount: validated.amount,
    tariffPerSqm: validated.tariffPerSqm,
    periodYear: validated.periodYear,
    periodMonth: validated.periodMonth,
    paymentMethod: validated.paymentMethod,
    referenceNo: validated.referenceNo,
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
  ownerId = uuidSchema.parse(ownerId);
  paymentId = uuidSchema.parse(paymentId);
  data = z.object({
    amount: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
    periodYear: z.number().int().min(2000).max(2200),
    periodMonth: z.number().int().min(1).max(12),
    paymentMethod: z.enum(["cash", "bank_transfer", "card", "e_manat", "pos_terminal"]),
    referenceNo: z.string().trim().max(100).optional(),
    tariffPerSqm: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
    notes: z.string().trim().max(2000).optional(),
  }).parse(data);
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
  if (existing.status === "confirmed" || existing.status === "rejected" || existing.status === "refunded") {
    throw new Error("Подтверждённые платежи нельзя редактировать");
  }

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
  ownerId = uuidSchema.parse(ownerId);
  paymentId = uuidSchema.parse(paymentId);
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
  if (existing.status === "confirmed" || existing.status === "rejected" || existing.status === "refunded") {
    throw new Error("Подтверждённые платежи нельзя удалять");
  }

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

export async function refundPaymentAction(ownerId: string, paymentId: string) {
  ownerId = uuidSchema.parse(ownerId);
  paymentId = uuidSchema.parse(paymentId);
  const { session, tenantId } = await requireTenantPermission("payment:write");
  await requireOwnerPaymentAccess(tenantId, ownerId, session.user.id, session.user.roles);
  const payment = await refundPayment(tenantId, paymentId, session.user.id);
  if (!payment) throw new Error("Платёж не найден");
  revalidatePath(`/owners/${ownerId}`);
  return { success: true, payment };
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
