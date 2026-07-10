import {db} from "@/core/db";
import {payments} from "@/core/db/schema/payments";
import {units} from "@/core/db/schema/units";
import {owners} from "@/core/db/schema/owners";
import {and, desc, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";

type RegisterPaymentInput = {
  chargeId?: string;
  unitId: string;
  ownerId: string;
  amount: string;
  periodYear: number;
  periodMonth: number;
  paymentMethod: "cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal";
  referenceNo?: string;
  notes?: string;
};

export async function registerPayment(tenantId: string, input: RegisterPaymentInput, userId: string) {
  const [payment] = await db
    .insert(payments)
    .values({
      tenantId,
      chargeId: input.chargeId ?? null,
      unitId: input.unitId,
      ownerId: input.ownerId,
      amount: input.amount,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      paymentMethod: input.paymentMethod,
      paymentDate: new Date(),
      referenceNo: input.referenceNo ?? null,
      notes: input.notes ?? null,
      status: "confirmed",
      confirmedBy: userId,
    })
    .returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "payment",
    entityId: payment.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return payment;
}

export async function confirmPayment(tenantId: string, paymentId: string, userId: string) {
  const [existing] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)))
    .limit(1);
  if (!existing) return null;

  const [payment] = await db
    .update(payments)
    .set({ status: "confirmed", confirmedBy: userId })
    .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)))
    .returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "payment",
    entityId: paymentId,
    oldValues: { status: existing.status } as Record<string, unknown>,
    newValues: { status: "confirmed" } as Record<string, unknown>,
  });

  return payment;
}

export async function listPayments(tenantId: string, unitId?: string) {
  const conditions = [eq(payments.tenantId, tenantId)];

  if (unitId) conditions.push(eq(payments.unitId, unitId));

  return await db
    .select()
    .from(payments)
    .where(and(...conditions))
    .orderBy(payments.paymentDate);
}

export async function listPaymentsWithDetails(tenantId: string, limit?: number) {
  const query = db
    .select({
      id: payments.id,
      amount: payments.amount,
      periodYear: payments.periodYear,
      periodMonth: payments.periodMonth,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      referenceNo: payments.referenceNo,
      status: payments.status,
      notes: payments.notes,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
      ownerName: owners.fullName,
    })
    .from(payments)
    .leftJoin(units, eq(units.id, payments.unitId))
    .leftJoin(owners, eq(owners.id, payments.ownerId))
    .where(eq(payments.tenantId, tenantId))
    .orderBy(desc(payments.paymentDate));

  return limit ? await query.limit(limit) : await query;
}
