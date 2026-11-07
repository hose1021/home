import {and, asc, eq, inArray, ne, sql} from "drizzle-orm";
import {db} from "@/core/db";
import {adjustments} from "@/core/db/schema/adjustments";
import {paymentAllocations} from "@/core/db/schema/allocations";
import {charges} from "@/core/db/schema/charges";
import {type ChargeStatus} from "@/core/db/schema/enums";
import {ADJUSTMENT_KINDS} from "@/core/db/schema/enums";
import {payments} from "@/core/db/schema/payments";
import {isoDate} from "@/modules/finance/period";
import {centsToDecimal, moneyToCents} from "./money";

const [CREDIT_KIND, DEBIT_KIND] = ADJUSTMENT_KINDS;

type Executor = typeof db;

/** Canonical charge status: cancelled stays; otherwise paid by allocation, then partial, overdue, pending. Pure. */
export function deriveChargeStatusFromBalance(input: {
    amountCents: number;
    creditCents: number;
    debitCents: number;
    allocatedCents: number;
    dueDate: string | null;
    today: Date;
    currentStatus: string | null;
}): ChargeStatus {
    if (input.currentStatus === "cancelled") return "cancelled";
    const netDue = input.amountCents + input.debitCents - input.creditCents;
    if (input.allocatedCents >= netDue) return "paid";
    if (input.allocatedCents > 0) return "partially_paid";
    const today = isoDate(input.today);
    return input.dueDate && input.dueDate < today ? "overdue" : "pending";
}

async function balanceForCharge(tx: Executor, tenantId: string, chargeId: string) {
    const [charge] = await tx
        .select({amount: charges.amount, dueDate: charges.dueDate, status: charges.status})
        .from(charges)
        .where(and(eq(charges.id, chargeId), eq(charges.tenantId, tenantId)))
        .limit(1);
    if (!charge) return null;

    const [allocated] = await tx
        .select({total: sql<string>`coalesce(sum(${paymentAllocations.amount}::numeric), 0)`})
        .from(paymentAllocations)
        .where(and(eq(paymentAllocations.tenantId, tenantId), eq(paymentAllocations.chargeId, chargeId)));

    const [adjusted] = await tx
        .select({
            credit: sql<string>`coalesce(sum(case when ${adjustments.kind} = ${CREDIT_KIND} then ${adjustments.amount}::numeric else 0 end), 0)`,
            debit: sql<string>`coalesce(sum(case when ${adjustments.kind} = ${DEBIT_KIND} then ${adjustments.amount}::numeric else 0 end), 0)`,
        })
        .from(adjustments)
        .where(and(eq(adjustments.tenantId, tenantId), eq(adjustments.chargeId, chargeId)));

    return {
        amount: charge.amount,
        dueDate: charge.dueDate,
        status: charge.status,
        allocatedCents: moneyToCents(allocated?.total ?? "0"),
        creditCents: moneyToCents(adjusted?.credit ?? "0"),
        debitCents: moneyToCents(adjusted?.debit ?? "0"),
    };
}

/** Recompute one charge status from allocations and adjustments. */
async function syncChargeStatus(tx: Executor, tenantId: string, chargeId: string): Promise<ChargeStatus | null> {
    const balance = await balanceForCharge(tx, tenantId, chargeId);
    if (!balance) return null;

    const next = deriveChargeStatusFromBalance({
        amountCents: moneyToCents(balance.amount),
        creditCents: balance.creditCents,
        debitCents: balance.debitCents,
        allocatedCents: balance.allocatedCents,
        dueDate: balance.dueDate,
        today: new Date(),
        currentStatus: balance.status,
    });
    if (next !== balance.status) {
        await tx
            .update(charges)
            .set({status: next})
            .where(and(eq(charges.id, chargeId), eq(charges.tenantId, tenantId)));
    }
    return next;
}

async function syncChargeStatuses(tx: Executor, tenantId: string, chargeIds: Iterable<string>): Promise<void> {
    for (const chargeId of new Set(chargeIds)) {
        await syncChargeStatus(tx, tenantId, chargeId);
    }
}

export async function releasePaymentAllocations(tx: Executor, tenantId: string, paymentId: string): Promise<void> {
    const prior = await tx
        .select({chargeId: paymentAllocations.chargeId})
        .from(paymentAllocations)
        .where(and(eq(paymentAllocations.tenantId, tenantId), eq(paymentAllocations.paymentId, paymentId)));
    await tx
        .delete(paymentAllocations)
        .where(and(eq(paymentAllocations.tenantId, tenantId), eq(paymentAllocations.paymentId, paymentId)));
    await syncChargeStatuses(tx, tenantId, prior.map((row) => row.chargeId));
}

/**
 * Apply a confirmed payment to the owner's outstanding charges, oldest due date first.
 * The payment's preferred charge (if any) goes first. Whatever is left stays as an advance.
 */
export async function allocatePayment(tx: Executor, tenantId: string, paymentId: string): Promise<void> {
    const [payment] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)))
        .limit(1);
    if (!payment) return;

    const prior = await tx
        .select({chargeId: paymentAllocations.chargeId})
        .from(paymentAllocations)
        .where(and(eq(paymentAllocations.tenantId, tenantId), eq(paymentAllocations.paymentId, paymentId)));
    await tx
        .delete(paymentAllocations)
        .where(and(eq(paymentAllocations.tenantId, tenantId), eq(paymentAllocations.paymentId, paymentId)));

    const affected = new Set(prior.map((row) => row.chargeId));
    if (payment.status !== "confirmed") {
        await syncChargeStatuses(tx, tenantId, affected);
        return;
    }

    const candidates = await tx
        .select({id: charges.id, amount: charges.amount, dueDate: charges.dueDate})
        .from(charges)
        .where(and(
            eq(charges.tenantId, tenantId),
            eq(charges.unitId, payment.unitId),
            ne(charges.status, "cancelled"),
        ))
        .orderBy(asc(charges.dueDate), asc(charges.periodYear), asc(charges.periodMonth), asc(charges.createdAt));
    if (candidates.length === 0) {
        await syncChargeStatuses(tx, tenantId, affected);
        return;
    }

    const preferred = candidates.findIndex((charge) => charge.id === payment.chargeId);
    if (preferred > 0) candidates.unshift(...candidates.splice(preferred, 1));

    const chargeIds = candidates.map((charge) => charge.id);
    const allocatedRows = await tx
        .select({chargeId: paymentAllocations.chargeId, total: sql<string>`sum(${paymentAllocations.amount}::numeric)`})
        .from(paymentAllocations)
        .where(and(eq(paymentAllocations.tenantId, tenantId), inArray(paymentAllocations.chargeId, chargeIds)))
        .groupBy(paymentAllocations.chargeId);
    const adjustmentRows = await tx
        .select({
            chargeId: adjustments.chargeId,
            credit: sql<string>`coalesce(sum(case when ${adjustments.kind} = ${CREDIT_KIND} then ${adjustments.amount}::numeric else 0 end), 0)`,
            debit: sql<string>`coalesce(sum(case when ${adjustments.kind} = ${DEBIT_KIND} then ${adjustments.amount}::numeric else 0 end), 0)`,
        })
        .from(adjustments)
        .where(and(eq(adjustments.tenantId, tenantId), inArray(adjustments.chargeId, chargeIds)))
        .groupBy(adjustments.chargeId);

    const allocatedByCharge = new Map(allocatedRows.map((row) => [row.chargeId, moneyToCents(row.total)]));
    const creditByCharge = new Map(adjustmentRows.map((row) => [row.chargeId, moneyToCents(row.credit)]));
    const debitByCharge = new Map(adjustmentRows.map((row) => [row.chargeId, moneyToCents(row.debit)]));

    let remaining = moneyToCents(payment.amount);
    const rows: {tenantId: string; paymentId: string; chargeId: string; amount: string}[] = [];

    for (const charge of candidates) {
        if (remaining <= 0) break;
        const netDue = moneyToCents(charge.amount) + (debitByCharge.get(charge.id) ?? 0) - (creditByCharge.get(charge.id) ?? 0);
        const outstanding = netDue - (allocatedByCharge.get(charge.id) ?? 0);
        if (outstanding <= 0) continue;
        const applied = Math.min(remaining, outstanding);
        rows.push({tenantId, paymentId, chargeId: charge.id, amount: centsToDecimal(applied)});
        allocatedByCharge.set(charge.id, (allocatedByCharge.get(charge.id) ?? 0) + applied);
        remaining -= applied;
        affected.add(charge.id);
    }

    if (rows.length > 0) {
        await tx.insert(paymentAllocations).values(rows);
    }
    await syncChargeStatuses(tx, tenantId, affected);
}

/** Confirmed money not yet applied to any charge — the tenant's advance balance. */
export async function getAdvanceBalance(tenantId: string): Promise<number> {
    const [paid] = await db
        .select({total: sql<string>`coalesce(sum(${payments.amount}::numeric) filter (where ${payments.status} = 'confirmed'), 0)`})
        .from(payments)
        .where(eq(payments.tenantId, tenantId));
    const [allocated] = await db
        .select({total: sql<string>`coalesce(sum(${paymentAllocations.amount}::numeric), 0)`})
        .from(paymentAllocations)
        .innerJoin(payments, eq(payments.id, paymentAllocations.paymentId))
        .where(and(eq(paymentAllocations.tenantId, tenantId), eq(payments.status, "confirmed")));

    return Number(paid?.total ?? 0) - Number(allocated?.total ?? 0);
}

/** Re-run allocation for every confirmed payment, oldest first. Used by the one-off backfill. */
export async function reallocateTenantPayments(tenantId: string): Promise<number> {
    return db.transaction(async (tx) => {
        const executor = tx as unknown as Executor;
        const rows = await tx
            .select({id: payments.id})
            .from(payments)
            .where(and(eq(payments.tenantId, tenantId), eq(payments.status, "confirmed")))
            .orderBy(asc(payments.paymentDate), asc(payments.createdAt));

        for (const row of rows) {
            await allocatePayment(executor, tenantId, row.id);
        }
        return rows.length;
    });
}
