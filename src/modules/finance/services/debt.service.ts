import {and, eq, ne, sql} from "drizzle-orm";
import {db} from "@/core/db";
import {adjustments} from "@/core/db/schema/adjustments";
import {paymentAllocations} from "@/core/db/schema/allocations";
import {charges} from "@/core/db/schema/charges";
import {getFinancialSettings} from "./settings.service";

export type BillingPeriod = {year: number; month: number};

export type DebtConfig = {
    tariffPerSqm: number;
    billingStart: string; // "YYYY-MM"
};

export type TenantDebtSummary = {totalDebt: number};

export type OwnerDebtStatus = {hasDebt: boolean; hasPaidThisPeriod: boolean};

/** Tariff config for the schedule display (monthly fee = area × tariff). */
export async function getDebtConfig(tenantId: string): Promise<DebtConfig> {
    const settings = await getFinancialSettings(tenantId);
    return {tariffPerSqm: settings.tariffPerSqm, billingStart: settings.billingStart};
}

/** Enumerate billing periods from billing start through `now`'s month. Pure, display only. */
export function buildPeriods(billingStart: string, now: Date = new Date()): BillingPeriod[] {
    const [startYearRaw, startMonthRaw] = billingStart.split("-").map(Number);
    const startYear = startYearRaw !== undefined && Number.isFinite(startYearRaw) ? startYearRaw : now.getFullYear();
    const startMonth = startMonthRaw !== undefined && Number.isFinite(startMonthRaw) ? Math.min(Math.max(startMonthRaw, 1), 12) : 1;
    const periods: BillingPeriod[] = [];
    for (let y = startYear; y <= now.getFullYear(); y++) {
        const mFrom = y === startYear ? startMonth : 1;
        const mTo = y === now.getFullYear() ? now.getMonth() + 1 : 12;
        for (let m = mFrom; m <= mTo; m++) periods.push({year: y, month: m});
    }
    return periods;
}

/** Schedule-view debt for one unit: Σ max(0, fee − paid). Pure, display only. */
export function unitDebt(monthlyFee: number, periods: BillingPeriod[], paidFor: (p: BillingPeriod) => number): number {
    let debt = 0;
    for (const p of periods) debt += Math.max(0, monthlyFee - paidFor(p));
    return debt;
}

/**
 * Outstanding amount of one charge: amount + debits − credits − allocations, never below zero.
 * This is the single financial truth; tariff-based numbers are schedule display only.
 */
function outstandingExpr(tenantId: string) {
    const allocated = sql<string>`coalesce((select sum(${paymentAllocations.amount}::numeric)
        from ${paymentAllocations}
        where ${paymentAllocations.tenantId} = ${tenantId}
          and ${paymentAllocations.chargeId} = ${charges.id}), 0)`;
    const credit = sql<string>`coalesce((select sum(${adjustments.amount}::numeric)
        from ${adjustments}
        where ${adjustments.tenantId} = ${tenantId}
          and ${adjustments.chargeId} = ${charges.id}
          and ${adjustments.kind} = 'credit'), 0)`;
    const debit = sql<string>`coalesce((select sum(${adjustments.amount}::numeric)
        from ${adjustments}
        where ${adjustments.tenantId} = ${tenantId}
          and ${adjustments.chargeId} = ${charges.id}
          and ${adjustments.kind} = 'debit'), 0)`;
    return sql<string>`greatest(${charges.amount}::numeric + ${debit} - ${credit} - ${allocated}, 0)`;
}

/** Tenant-wide outstanding debt across non-cancelled charges. */
export async function getTenantDebtSummary(tenantId: string): Promise<TenantDebtSummary> {
    const [row] = await db
        .select({total: sql<string>`coalesce(sum(${outstandingExpr(tenantId)}), 0)`})
        .from(charges)
        .where(and(eq(charges.tenantId, tenantId), ne(charges.status, "cancelled")));
    return {totalDebt: Math.round(Number(row?.total ?? 0) * 100) / 100};
}

/** Outstanding per unit, charge-based. */
export async function getOutstandingByUnit(tenantId: string): Promise<Map<string, number>> {
    const rows = await db
        .select({unitId: charges.unitId, total: sql<string>`coalesce(sum(${outstandingExpr(tenantId)}), 0)`})
        .from(charges)
        .where(and(eq(charges.tenantId, tenantId), ne(charges.status, "cancelled")))
        .groupBy(charges.unitId);
    return new Map(rows.map((row) => [row.unitId, Number(row.total)]));
}

/** Outstanding per owner, charge-based. */
export async function getOutstandingByOwner(tenantId: string): Promise<Map<string, number>> {
    const rows = await db
        .select({ownerId: charges.ownerId, total: sql<string>`coalesce(sum(${outstandingExpr(tenantId)}), 0)`})
        .from(charges)
        .where(and(eq(charges.tenantId, tenantId), ne(charges.status, "cancelled")))
        .groupBy(charges.ownerId);
    return new Map(rows.map((row) => [row.ownerId, Number(row.total)]));
}

/** Per-owner flags for the registry: debt from charges, paid when every current-period charge is settled. */
export async function getOwnersDebtStatus(tenantId: string): Promise<Map<string, OwnerDebtStatus>> {
    const out = new Map<string, OwnerDebtStatus>();
    const debtRows = await db
        .select({ownerId: charges.ownerId, total: sql<string>`coalesce(sum(${outstandingExpr(tenantId)}), 0)`})
        .from(charges)
        .where(and(eq(charges.tenantId, tenantId), ne(charges.status, "cancelled")))
        .groupBy(charges.ownerId);

    for (const row of debtRows) {
        out.set(row.ownerId, {hasDebt: Number(row.total) > 0, hasPaidThisPeriod: false});
    }

    const current = buildPeriods((await getDebtConfig(tenantId)).billingStart).at(-1);
    if (current) {
        const periodRows = await db
            .select({
                ownerId: charges.ownerId,
                total: sql<number>`count(*)`,
                unpaid: sql<number>`count(*) filter (where ${charges.status} <> 'paid')`,
            })
            .from(charges)
            .where(and(
                eq(charges.tenantId, tenantId),
                eq(charges.periodYear, current.year),
                eq(charges.periodMonth, current.month),
                ne(charges.status, "cancelled"),
            ))
            .groupBy(charges.ownerId);

        for (const row of periodRows) {
            const entry = out.get(row.ownerId) ?? {hasDebt: false, hasPaidThisPeriod: false};
            entry.hasPaidThisPeriod = Number(row.total) > 0 && Number(row.unpaid) === 0;
            out.set(row.ownerId, entry);
        }
    }

    return out;
}
