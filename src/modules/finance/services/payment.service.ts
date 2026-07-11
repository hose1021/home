import {db} from "@/core/db";
import {payments} from "@/core/db/schema/payments";
import {units} from "@/core/db/schema/units";
import {owners, ownerships} from "@/core/db/schema/owners";
import {charges} from "@/core/db/schema/charges";
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
  tariffPerSqm?: string;
};

export async function registerPayment(tenantId: string, input: RegisterPaymentInput, userId: string) {
  validatePaymentValues(input);
  await validatePaymentRelations(tenantId, input);

  const [payment] = await db
    .insert(payments)
    .values({
      tenantId,
      chargeId: input.chargeId ?? null,
      unitId: input.unitId,
      ownerId: input.ownerId,
      amount: input.amount,
      tariffPerSqm: input.tariffPerSqm,
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

export async function ownerBelongsToUser(tenantId: string, ownerId: string, userId: string): Promise<boolean> {
  const [owner] = await db
    .select({id: owners.id})
    .from(owners)
    .where(and(
      eq(owners.id, ownerId),
      eq(owners.tenantId, tenantId),
      eq(owners.userId, userId),
      eq(owners.status, "active"),
    ))
    .limit(1);
  return Boolean(owner);
}

export function validatePaymentValues(input: {
  amount: string;
  periodYear: number;
  periodMonth: number;
  paymentMethod: string;
  tariffPerSqm?: string;
}): void {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payment amount must be positive");
  if (!Number.isInteger(input.periodYear) || input.periodYear < 2000 || input.periodYear > 2200) {
    throw new Error("Invalid payment year");
  }
  if (!Number.isInteger(input.periodMonth) || input.periodMonth < 1 || input.periodMonth > 12) {
    throw new Error("Invalid payment month");
  }
  if (!["cash", "bank_transfer", "card", "e_manat", "pos_terminal", "other"].includes(input.paymentMethod)) {
    throw new Error("Invalid payment method");
  }
  if (input.tariffPerSqm !== undefined) {
    const tariff = Number(input.tariffPerSqm);
    if (!Number.isFinite(tariff) || tariff < 0) throw new Error("Invalid tariff");
  }
}

async function validatePaymentRelations(tenantId: string, input: RegisterPaymentInput): Promise<void> {
  const [unitRows, ownerRows, ownershipRows, chargeRows] = await Promise.all([
    db.select({id: units.id}).from(units).where(and(
      eq(units.id, input.unitId),
      eq(units.tenantId, tenantId),
      eq(units.status, "active"),
    )).limit(1),
    db.select({id: owners.id}).from(owners).where(and(
      eq(owners.id, input.ownerId),
      eq(owners.tenantId, tenantId),
      eq(owners.status, "active"),
    )).limit(1),
    db.select({id: ownerships.id}).from(ownerships).where(and(
      eq(ownerships.tenantId, tenantId),
      eq(ownerships.unitId, input.unitId),
      eq(ownerships.ownerId, input.ownerId),
    )).limit(1),
    input.chargeId
      ? db.select({id: charges.id}).from(charges).where(and(
          eq(charges.id, input.chargeId),
          eq(charges.tenantId, tenantId),
          eq(charges.unitId, input.unitId),
          eq(charges.ownerId, input.ownerId),
        )).limit(1)
      : Promise.resolve([{id: "not-applicable"}]),
  ]);

  if (!unitRows[0]) throw new Error("Unit not found");
  if (!ownerRows[0]) throw new Error("Owner not found");
  if (!ownershipRows[0]) throw new Error("Owner does not own this unit");
  if (!chargeRows[0]) throw new Error("Charge not found");
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
