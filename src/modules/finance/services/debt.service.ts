import {and, eq, ne, sql} from "drizzle-orm";
import {db} from "@/core/db";
import {adjustments} from "@/core/db/schema/adjustments";
import {paymentAllocations} from "@/core/db/schema/allocations";
import {charges} from "@/core/db/schema/charges";
import {ADJUSTMENT_KINDS} from "@/core/db/schema/enums";
import {owners} from "@/core/db/schema/owners";
import {units} from "@/core/db/schema/units";
import {parsePeriodKey} from "@/modules/finance/period";
import {moneyToCents} from "./money";
import {getFinancialSettings} from "./settings.service";

const [CREDIT_KIND, DEBIT_KIND] = ADJUSTMENT_KINDS;

export type BillingPeriod = {year: number; month: number};

export type DebtConfig = {
    tariffPerSqm: number;
    billingStart: string; // "YYYY-MM"
};

export type TenantDebtSummary = {totalDebt: number};

export type OwnerDebtStatus = {hasDebt: boolean; hasPaidThisPeriod: boolean};

/** One non-cancelled charge with every money component in whole cents. */
export type ChargeBalance = {
    id: string;
    ownerId: string;
    ownerName: string | null;
    unitId: string;
    unitNumber: string | null;
    dueDate: string;
    status: string;
    periodYear: number;
    periodMonth: number;
    amountCents: number;
    allocatedCents: number;
    creditCents: number;
    debitCents: number;
};

/** What the charge owes after adjustments, before payments. Never negative. */
export function netDueCents(balance: ChargeBalance): number {
    return Math.max(0, balance.amountCents + balance.debitCents - balance.creditCents);
}

/** What is still unpaid on the charge: net due minus allocations, never below zero. */
export function outstandingCents(balance: ChargeBalance): number {
    return Math.max(0, netDueCents(balance) - balance.allocatedCents);
}

/**
 * The single charge-balance read model: one row per non-cancelled charge with amount, allocations
 * and adjustments resolved from their own tables, in whole cents. Every debt figure derives from it.
 */
export async function loadChargeBalances(tenantId: string): Promise<ChargeBalance[]> {
    const allocated = sql<string>`coalesce((select sum(${paymentAllocations.amount}::numeric)
        from ${paymentAllocations}
        where ${paymentAllocations.tenantId} = ${tenantId}
          and ${paymentAllocations.chargeId} = ${charges.id}), 0)`;
    const credit = sql<string>`coalesce((select sum(${adjustments.amount}::numeric)
        from ${adjustments}
        where ${adjustments.tenantId} = ${tenantId}
          and ${adjustments.chargeId} = ${charges.id}
          and ${adjustments.kind} = ${CREDIT_KIND}), 0)`;
    const debit = sql<string>`coalesce((select sum(${adjustments.amount}::numeric)
        from ${adjustments}
        where ${adjustments.tenantId} = ${tenantId}
          and ${adjustments.chargeId} = ${charges.id}
          and ${adjustments.kind} = ${DEBIT_KIND}), 0)`;

    const rows = await db
        .select({
            id: charges.id,
            ownerId: charges.ownerId,
            ownerName: owners.fullName,
            unitId: charges.unitId,
            unitNumber: units.unitNumber,
            dueDate: charges.dueDate,
            status: charges.status,
            periodYear: charges.periodYear,
            periodMonth: charges.periodMonth,
            amount: charges.amount,
            allocated,
            credit,
            debit,
        })
        .from(charges)
        .leftJoin(units, and(eq(units.id, charges.unitId), eq(units.tenantId, tenantId)))
        .leftJoin(owners, and(eq(owners.id, charges.ownerId), eq(owners.tenantId, tenantId)))
        .where(and(eq(charges.tenantId, tenantId), ne(charges.status, "cancelled")));

    return rows.map((row) => ({
        id: row.id,
        ownerId: row.ownerId,
        ownerName: row.ownerName,
        unitId: row.unitId,
        unitNumber: row.unitNumber,
        dueDate: row.dueDate,
        status: row.status,
        periodYear: row.periodYear,
        periodMonth: row.periodMonth,
        amountCents: moneyToCents(row.amount),
        allocatedCents: moneyToCents(row.allocated),
        creditCents: moneyToCents(row.credit),
        debitCents: moneyToCents(row.debit),
    }));
}

/** Tariff config for the schedule display (monthly fee = area × tariff). */
export async function getDebtConfig(tenantId: string): Promise<DebtConfig> {
    const settings = await getFinancialSettings(tenantId);
    return {tariffPerSqm: settings.tariffPerSqm, billingStart: settings.billingStart};
}

/** Enumerate billing periods from billing start through `now`'s month. Pure, display only. */
export function buildPeriods(billingStart: string, now: Date = new Date()): BillingPeriod[] {
    const parsed = parsePeriodKey(billingStart);
    const startYear = Number.isFinite(parsed.year) ? parsed.year : now.getFullYear();
    const startMonth = Number.isFinite(parsed.month) ? Math.min(Math.max(parsed.month, 1), 12) : 1;
    const periods: BillingPeriod[] = [];
    for (let y = startYear; y <= now.getFullYear(); y++) {
        const mFrom = y === startYear ? startMonth : 1;
        const mTo = y === now.getFullYear() ? now.getMonth() + 1 : 12;
        for (let m = mFrom; m <= mTo; m++) periods.push({year: y, month: m});
    }
    return periods;
}

/** Tenant-wide outstanding debt across non-cancelled charges. */
export async function getTenantDebtSummary(tenantId: string): Promise<TenantDebtSummary> {
    const balances = await loadChargeBalances(tenantId);
    const totalCents = balances.reduce((sum, balance) => sum + outstandingCents(balance), 0);
    return {totalDebt: totalCents / 100};
}

/** Outstanding per unit, charge-based. */
export async function getOutstandingByUnit(tenantId: string): Promise<Map<string, number>> {
    const totals = new Map<string, number>();
    for (const balance of await loadChargeBalances(tenantId)) {
        totals.set(balance.unitId, (totals.get(balance.unitId) ?? 0) + outstandingCents(balance));
    }
    return new Map([...totals].map(([unitId, cents]) => [unitId, cents / 100]));
}

/** Per-owner flags for the registry: debt from charges, paid when every current-period charge is settled. */
export async function getOwnersDebtStatus(tenantId: string): Promise<Map<string, OwnerDebtStatus>> {
    const out = new Map<string, OwnerDebtStatus>();

    for (const balance of await loadChargeBalances(tenantId)) {
        const entry = out.get(balance.ownerId) ?? {hasDebt: false, hasPaidThisPeriod: false};
        if (outstandingCents(balance) > 0) entry.hasDebt = true;
        out.set(balance.ownerId, entry);
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
