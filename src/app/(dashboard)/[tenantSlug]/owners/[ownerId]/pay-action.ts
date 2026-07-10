"use server";

import {revalidatePath} from "next/cache";
import {and, eq} from "drizzle-orm";
import {requireTenantPermission} from "@/core/auth/session";
import {db} from "@/core/db";
import {payments} from "@/core/db/schema/payments";
import {writeAuditLog} from "@/core/audit/audit.service";

export async function payForUnitAction(
  slug: string,
  ownerId: string,
  unitId: string,
  amount: string,
  periodYear: number,
  periodMonth: number,
  paymentMethod: "cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal",
  referenceNo: string | undefined,
  tariffPerSqm: string,
) {
  const { session, tenantId } = await requireTenantPermission(slug, "payment:write");

  const [payment] = await db
    .insert(payments)
    .values({
      tenantId,
      unitId,
      ownerId,
      amount,
      tariffPerSqm,
      periodYear,
      periodMonth,
      paymentMethod,
      referenceNo: referenceNo ?? null,
      paymentDate: new Date(),
      status: "confirmed",
      confirmedBy: session.user.id,
    })
    .returning();

  await writeAuditLog({
    tenantId,
    userId: session.user.id,
    action: "create",
    entityType: "payment",
    entityId: payment.id,
    newValues: { unitId, ownerId, amount, tariffPerSqm, periodYear, periodMonth, paymentMethod },
  });

  revalidatePath(`/${slug}/owners/${ownerId}`);
  return { success: true, payment };
}

export async function editPaymentAction(
  slug: string,
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
  const { session, tenantId } = await requireTenantPermission(slug, "payment:write");

  const [existing] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)))
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
    .where(eq(payments.id, paymentId))
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

  revalidatePath(`/${slug}/owners/${ownerId}`);
  return { success: true, payment: updated };
}

export async function deletePaymentAction(
  slug: string,
  ownerId: string,
  paymentId: string,
) {
  const { session, tenantId } = await requireTenantPermission(slug, "payment:write");

  const [existing] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)))
    .limit(1);

  if (!existing) throw new Error("Платёж не найден");

  await db.delete(payments).where(eq(payments.id, paymentId));

  await writeAuditLog({
    tenantId,
    userId: session.user.id,
    action: "delete",
    entityType: "payment",
    entityId: paymentId,
    oldValues: { amount: existing.amount, periodYear: existing.periodYear, periodMonth: existing.periodMonth },
  });

  revalidatePath(`/${slug}/owners/${ownerId}`);
  return { success: true };
}
