import {and, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {hasStaffRole} from "@/core/auth/permissions";
import {db} from "@/core/db";
import {charges} from "@/core/db/schema/charges";
import {BILLING, PAYMENT_METHODS, type PaymentMethod} from "@/core/db/schema/enums";
import {owners, ownerships} from "@/core/db/schema/owners";
import {payments} from "@/core/db/schema/payments";
import {tenants} from "@/core/db/schema/tenants";
import {units} from "@/core/db/schema/units";
import {DomainError, ForbiddenError} from "@/core/errors/app-error";
import {allocatePayment, releasePaymentAllocations} from "./allocation.service";


/** Domain error with a machine code; server actions translate codes via next-intl (ADR 0001). */
export class PaymentError extends DomainError {
  constructor(code: "not_found" | "immutable_status", message: string = code) {
    super(code, message, code === "not_found" ? 404 : 409);
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
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  notes?: string;
  tariffPerSqm?: string;
};

export async function registerPayment(tenantId: string, input: RegisterPaymentInput, userId: string) {
  validatePaymentValues(input);
  await validatePaymentRelations(tenantId, input);

  const payment = await db.transaction(async (tx) => {
    if (input.chargeId) {
      const [charge] = await tx
        .select({status: charges.status})
        .from(charges)
        .where(and(eq(charges.id, input.chargeId), eq(charges.tenantId, tenantId)))
        .limit(1);
      if (!charge || charge.status === "cancelled") throw new DomainError("chargeNotPayable");
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
    if (!created) throw new Error("Failed to register payment");

    await writeAuditLog({
      tenantId,
      userId,
      action: "create",
      entityType: "payment",
      entityId: created.id,
      newValues: input as unknown as Record<string, unknown>,
    }, tx as unknown as typeof db);

    await allocatePayment(tx as unknown as typeof db, tenantId, created.id);

    return created;
  });

  return payment;
}

async function ownerBelongsToUser(tenantId: string, ownerId: string, userId: string): Promise<boolean> {
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
  paymentMethod: PaymentMethod;
  tariffPerSqm?: string;
}): void {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new DomainError("paymentAmountPositive");
  if (!Number.isInteger(input.periodYear) || input.periodYear < BILLING.minYear || input.periodYear > BILLING.maxYear) {
    throw new DomainError("invalidPaymentYear");
  }
  if (!Number.isInteger(input.periodMonth) || input.periodMonth < BILLING.minMonth || input.periodMonth > BILLING.maxMonth) {
    throw new DomainError("invalidPaymentMonth");
  }
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
    throw new DomainError("invalidPaymentMethod");
  }
  if (input.tariffPerSqm !== undefined) {
    const tariff = Number(input.tariffPerSqm);
    if (!Number.isFinite(tariff) || tariff < 0) throw new DomainError("invalidTariff");
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

  if (!unitRows[0]) throw new DomainError("unitNotFound");
  if (!ownerRows[0]) throw new DomainError("ownerNotFound");
  if (!ownershipRows[0]) throw new DomainError("ownerUnitMismatch");
  if (!chargeRows[0]) throw new DomainError("chargeNotFound");
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

    await releasePaymentAllocations(tx as unknown as typeof db, tenantId, paymentId);

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

export type PaymentReceipt = {
  id: string;
  amount: string;
  tariffPerSqm: string;
  periodYear: number;
  periodMonth: number;
  paymentDate: Date;
  paymentMethod: string;
  referenceNo: string | null;
  status: string;
  notes: string | null;
  ownerId: string;
  ownerFullName: string;
  unitNumber: string;
  entrance: number;
  floor: number;
  area: string;
  tenantName: string;
  tenantAddress: string | null;
  tenantPhone: string | null;
};

/** Single source of truth for the printable payment receipt: payment + unit + owner + tenant in one query. */
export async function getPaymentReceipt(tenantId: string, paymentId: string): Promise<PaymentReceipt | null> {
  const [row] = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      tariffPerSqm: payments.tariffPerSqm,
      periodYear: payments.periodYear,
      periodMonth: payments.periodMonth,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      referenceNo: payments.referenceNo,
      status: payments.status,
      notes: payments.notes,
      ownerId: owners.id,
      ownerFullName: owners.fullName,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
      area: units.area,
      tenantName: tenants.name,
      tenantAddress: tenants.address,
      tenantPhone: tenants.phone,
    })
    .from(payments)
    .innerJoin(units, and(eq(units.id, payments.unitId), eq(units.tenantId, tenantId)))
    .innerJoin(owners, and(eq(owners.id, payments.ownerId), eq(owners.tenantId, tenantId)))
    .innerJoin(tenants, eq(tenants.id, tenantId))
    .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)))
    .limit(1);

  return row ?? null;
}

/** Staff may touch any payment; owners only their own. Shared by actions and the receipt page. */
export async function requireOwnerPaymentAccess(
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
