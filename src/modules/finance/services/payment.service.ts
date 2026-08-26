import {db} from "@/core/db";
import {payments} from "@/core/db/schema/payments";
import {units} from "@/core/db/schema/units";
import {owners, ownerships} from "@/core/db/schema/owners";
import {charges} from "@/core/db/schema/charges";
import {and, desc, eq, inArray, sql} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {AppError} from "@/core/errors/app-error";

/** Domain error with a machine code; server actions translate codes via next-intl (ADR 0001). */
export class PaymentError extends AppError {
  constructor(code: "not_found" | "immutable_status", message: string = code) {
    super(message, code === "not_found" ? 404 : 409, code);
    this.name = "PaymentError";
  }
}

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

type ChargeStatus = "pending" | "paid" | "partially_paid" | "overdue" | "cancelled";
type MoneyRow = { amount: string };

function moneyToCents(amount: string | number): number {
  const cents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(cents)) throw new Error("Invalid monetary amount");
  return cents;
}

function sumMoneyCents(rows: ReadonlyArray<MoneyRow>): number {
  let total = 0;
  for (const row of rows) {
    total += moneyToCents(row.amount);
  }
  return total;
}

export function deriveChargeStatus(chargeAmount: string, confirmedPaymentTotalCents: number): ChargeStatus {
  if (confirmedPaymentTotalCents <= 0) return "pending";
  if (confirmedPaymentTotalCents >= moneyToCents(chargeAmount)) return "paid";
  return "partially_paid";
}

async function confirmedPaymentTotalCents(tx: typeof db, tenantId: string, chargeId: string): Promise<number> {
  const chargePayments = await tx
    .select({amount: payments.amount})
    .from(payments)
    .where(and(
      eq(payments.tenantId, tenantId),
      eq(payments.chargeId, chargeId),
      eq(payments.status, "confirmed"),
    ));
  return sumMoneyCents(chargePayments);
}

async function syncChargeStatus(tx: typeof db, tenantId: string, chargeId: string): Promise<ChargeStatus> {
  const [charge] = await tx
    .select({amount: charges.amount})
    .from(charges)
    .where(and(eq(charges.id, chargeId), eq(charges.tenantId, tenantId)))
    .limit(1);
  if (!charge) throw new Error("Charge not found");

  const status = deriveChargeStatus(charge.amount, await confirmedPaymentTotalCents(tx, tenantId, chargeId));
  await tx
    .update(charges)
    .set({status})
    .where(and(eq(charges.id, chargeId), eq(charges.tenantId, tenantId)));
  return status;
}

export async function getTenantOutstandingDebt(tenantId: string): Promise<string> {
  const [result] = await db
    .select({
      total: sql<string>`coalesce(sum(greatest(${charges.amount}::numeric - coalesce((
        select sum(${payments.amount}::numeric)
        from ${payments}
        where ${payments.tenantId} = ${tenantId}
          and ${payments.chargeId} = ${charges.id}
          and ${payments.status} = 'confirmed'
      ), 0), 0)), 0)`,
    })
    .from(charges)
    .where(and(
      eq(charges.tenantId, tenantId),
      inArray(charges.status, ["pending", "partially_paid", "overdue"]),
    ));

  return result?.total ?? "0";
}

export async function getOwnerPaymentFlags(
  tenantId: string,
  ownerIds: string[],
  previousPeriod: {year: number; month: number},
  currentPeriod: {year: number; month: number},
): Promise<Map<string, {hasDebt: boolean; hasPaid: boolean}>> {
  const flags = new Map(ownerIds.map((ownerId) => [ownerId, {hasDebt: false, hasPaid: false}]));
  if (ownerIds.length === 0) return flags;

  const [previousCharges, currentCharges] = await Promise.all([
    db
      .select({ownerId: charges.ownerId, status: charges.status})
      .from(charges)
      .where(and(
        eq(charges.tenantId, tenantId),
        eq(charges.periodYear, previousPeriod.year),
        eq(charges.periodMonth, previousPeriod.month),
        inArray(charges.ownerId, ownerIds),
      )),
    db
      .select({ownerId: charges.ownerId, status: charges.status})
      .from(charges)
      .where(and(
        eq(charges.tenantId, tenantId),
        eq(charges.periodYear, currentPeriod.year),
        eq(charges.periodMonth, currentPeriod.month),
        inArray(charges.ownerId, ownerIds),
      )),
  ]);

  for (const charge of previousCharges) {
    if (charge.status === "paid") continue;
    flags.set(charge.ownerId, {...(flags.get(charge.ownerId) ?? {hasDebt: false, hasPaid: false}), hasDebt: true});
  }
  for (const charge of currentCharges) {
    if (charge.status !== "paid") continue;
    flags.set(charge.ownerId, {...(flags.get(charge.ownerId) ?? {hasDebt: false, hasPaid: false}), hasPaid: true});
  }

  return flags;
}

export async function registerPayment(tenantId: string, input: RegisterPaymentInput, userId: string) {
  validatePaymentValues(input);
  await validatePaymentRelations(tenantId, input);

  const payment = await db.transaction(async (tx) => {
    if (input.chargeId) {
      const [charge] = await tx
        .select()
        .from(charges)
        .where(and(eq(charges.id, input.chargeId), eq(charges.tenantId, tenantId)))
        .limit(1);
      if (!charge || charge.status === "cancelled") throw new Error("Charge is not payable");
      const paidBefore = await confirmedPaymentTotalCents(tx as unknown as typeof db, tenantId, input.chargeId);
      if (paidBefore + moneyToCents(input.amount) > moneyToCents(charge.amount)) {
        throw new Error("Payment exceeds the outstanding charge amount");
      }
    }

    const [created] = await tx
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
      entityId: created.id,
      newValues: input as unknown as Record<string, unknown>,
    }, tx as unknown as typeof db);

    if (input.chargeId) {
      await syncChargeStatus(tx as unknown as typeof db, tenantId, input.chargeId);
    }

    return created;
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

export async function refundPayment(tenantId: string, paymentId: string, userId: string) {
  const payment = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)))
      .limit(1);
    if (!existing) throw new PaymentError("not_found");
    if (existing.status !== "confirmed") throw new PaymentError("immutable_status", "Only confirmed payments can be refunded");

    const [updated] = await tx
      .update(payments)
      .set({ status: "refunded", updatedAt: new Date() })
      .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId), eq(payments.status, "confirmed")))
      .returning();
    if (!updated) throw new Error("Payment was changed concurrently");

    if (existing.chargeId) {
      await syncChargeStatus(tx as unknown as typeof db, tenantId, existing.chargeId);
    }

    await writeAuditLog({
      tenantId,
      userId,
      action: "update",
      entityType: "payment",
      entityId: paymentId,
      oldValues: { status: existing.status },
      newValues: { status: updated.status },
    }, tx as unknown as typeof db);
    return updated;
  });
  return payment;
}

export async function markChargePaidIfSettled(tenantId: string, chargeId: string, userId: string) {
  const [existing] = await db
    .select()
    .from(charges)
    .where(and(eq(charges.id, chargeId), eq(charges.tenantId, tenantId)))
    .limit(1);
  if (!existing) throw new Error("Charge not found");
  if (existing.status === "cancelled") throw new Error("Charge is not payable");

  const status = deriveChargeStatus(existing.amount, await confirmedPaymentTotalCents(db, tenantId, chargeId));
  if (status !== "paid") {
    throw new Error("A charge can only be marked paid after the full amount is registered");
  }
  if (existing.status === "paid") return existing;

  const [updated] = await db
    .update(charges)
    .set({status: "paid"})
    .where(and(eq(charges.id, chargeId), eq(charges.tenantId, tenantId)))
    .returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "charge",
    entityId: chargeId,
    oldValues: { status: existing.status } as Record<string, unknown>,
    newValues: { status: "paid" } as Record<string, unknown>,
  });

  return updated;
}

export async function listPayments(tenantId: string, unitId?: string) {
  const conditions = [eq(payments.tenantId, tenantId)];

  if (unitId) conditions.push(eq(payments.unitId, unitId));

  return await db
    .select()
    .from(payments)
    .where(and(...conditions))
    .orderBy(payments.paymentDate)
    .limit(500);
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
    .leftJoin(units, and(eq(units.id, payments.unitId), eq(units.tenantId, tenantId)))
    .leftJoin(owners, and(eq(owners.id, payments.ownerId), eq(owners.tenantId, tenantId)))
    .where(eq(payments.tenantId, tenantId))
    .orderBy(desc(payments.paymentDate));

  return await query.limit(Math.min(limit ?? 500, 500));
}
