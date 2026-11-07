import {and, desc, eq, sql} from "drizzle-orm";
import {db} from "@/core/db";
import {adjustments} from "@/core/db/schema/adjustments";
import {paymentAllocations} from "@/core/db/schema/allocations";
import {charges as chargesTable} from "@/core/db/schema/charges";
import {type AdjustmentKind, type ChargeStatus} from "@/core/db/schema/enums";
import {owners} from "@/core/db/schema/owners";
import {payments} from "@/core/db/schema/payments";
import {units} from "@/core/db/schema/units";
import {isoDate, periodKey} from "@/modules/finance/period";
import {ageBucket, type AgeingBuckets} from "../ageing";
import {deriveChargeStatusFromBalance, getAdvanceBalance} from "./allocation.service";
import {loadChargeBalances, netDueCents, outstandingCents, type ChargeBalance} from "./debt.service";
import {getBuildingBudget, listExpenses} from "./expense.service";
import {moneyToCents} from "./money";

export type FinanceAnalytics = {
    charged: number;
    paid: number;
    outstanding: number;
    advances: number;
    collectionRate: number;
    chargesCount: number;
    debtorsCount: number;
    ageing: AgeingBuckets;
};

export type DebtorRow = {
    ownerId: string;
    ownerName: string;
    unitNumbers: string[];
    outstanding: number;
    oldestDueDate: string | null;
    daysOverdue: number;
};

function toMoney(cents: number): number {
    return cents / 100;
}


export function daysOverdue(dueDate: string, now: Date): number {
    const due = Date.parse(`${dueDate}T00:00:00`);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.floor((today - due) / 86_400_000);
}

/** Display status is the same rule the allocation engine stores; no second overdue policy. */
function resolveChargeStatus(balance: ChargeBalance, today: Date): ChargeStatus {
    return deriveChargeStatusFromBalance({
        amountCents: balance.amountCents,
        creditCents: balance.creditCents,
        debitCents: balance.debitCents,
        allocatedCents: balance.allocatedCents,
        dueDate: balance.dueDate,
        today,
        currentStatus: balance.status,
    });
}

export async function getFinanceAnalytics(tenantId: string, asOf = new Date()): Promise<FinanceAnalytics> {
    const [balances, advances] = await Promise.all([loadChargeBalances(tenantId), getAdvanceBalance(tenantId)]);
    const today = asOf;
    const asOfKey = isoDate(asOf);

    let charged = 0;
    let paid = 0;
    let outstanding = 0;
    const seenDebtors = new Set<string>();
    const ageing: AgeingBuckets = {notDue: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0};

    for (const balance of balances) {
        if (balance.dueDate > asOfKey) continue;
        charged += netDueCents(balance);
        paid += Math.min(balance.allocatedCents, netDueCents(balance));
        const due = outstandingCents(balance);
        outstanding += due;
        if (due > 0) {
            seenDebtors.add(balance.ownerId);
            ageing[ageBucket(daysOverdue(balance.dueDate, today))] += due;
        }
    }

    return {
        charged: toMoney(charged),
        paid: toMoney(paid),
        outstanding: toMoney(outstanding),
        advances: moneyToCents(advances) / 100,
        collectionRate: charged > 0 ? Math.round((paid / charged) * 1000) / 10 : 0,
        chargesCount: balances.length,
        debtorsCount: seenDebtors.size,
        ageing: {
            notDue: toMoney(ageing.notDue),
            days1to30: toMoney(ageing.days1to30),
            days31to60: toMoney(ageing.days31to60),
            days61to90: toMoney(ageing.days61to90),
            over90: toMoney(ageing.over90),
        },
    };
}

export async function listDebtors(tenantId: string, asOf = new Date()): Promise<DebtorRow[]> {
    const balances = await loadChargeBalances(tenantId);
    const today = asOf;
    const asOfKey = isoDate(asOf);
    const grouped = new Map<string, {ownerName: string; outstanding: number; units: Set<string>; oldest: string | null}>();

    for (const balance of balances) {
        if (balance.dueDate > asOfKey) continue;
        const due = outstandingCents(balance);
        if (due <= 0) continue;
        const entry = grouped.get(balance.ownerId) ?? {
            ownerName: balance.ownerName ?? "—",
            outstanding: 0,
            units: new Set<string>(),
            oldest: null,
        };
        entry.outstanding += due;
        if (balance.unitNumber) entry.units.add(balance.unitNumber);
        if (!entry.oldest || balance.dueDate < entry.oldest) entry.oldest = balance.dueDate;
        grouped.set(balance.ownerId, entry);
    }

    return [...grouped.entries()]
        .map(([ownerId, entry]) => ({
            ownerId,
            ownerName: entry.ownerName,
            unitNumbers: [...entry.units].sort((a, b) => a.localeCompare(b, "ru")),
            outstanding: toMoney(entry.outstanding),
            oldestDueDate: entry.oldest,
            daysOverdue: entry.oldest ? Math.max(0, daysOverdue(entry.oldest, today)) : 0,
        }))
        .sort((a, b) => b.outstanding - a.outstanding);
}

/* ── Ledger views: charges and payments as separate, self-describing rows ── */

export type ChargeView = {
    id: string;
    ownerId: string;
    ownerName: string | null;
    unitNumber: string | null;
    dueDate: string;
    periodYear: number;
    periodMonth: number;
    amount: number;
    paid: number;
    outstanding: number;
    status: string;
};

export async function listChargeViews(tenantId: string, asOf = new Date()): Promise<ChargeView[]> {
    const balances = await loadChargeBalances(tenantId);
    const views = balances.map((balance) => {
        const outstanding = outstandingCents(balance);
        return {
            id: balance.id,
            ownerId: balance.ownerId,
            ownerName: balance.ownerName,
            unitNumber: balance.unitNumber,
            dueDate: balance.dueDate,
            periodYear: balance.periodYear,
            periodMonth: balance.periodMonth,
            amount: toMoney(netDueCents(balance)),
            paid: toMoney(Math.min(balance.allocatedCents, netDueCents(balance))),
            outstanding: toMoney(outstanding),
            status: resolveChargeStatus(balance, asOf),
        };
    });
    return views.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}

export type PaymentView = {
    id: string;
    ownerId: string;
    ownerName: string | null;
    unitNumber: string | null;
    paymentDate: string;
    periodYear: number;
    periodMonth: number;
    amount: number;
    allocated: number;
    unallocated: number;
    method: string;
    referenceNo: string | null;
    status: string;
};

export async function listPaymentViews(tenantId: string): Promise<PaymentView[]> {
    const allocated = sql<string>`coalesce((select sum(${paymentAllocations.amount}::numeric)
        from ${paymentAllocations}
        where ${paymentAllocations.tenantId} = ${tenantId}
          and ${paymentAllocations.paymentId} = ${payments.id}), 0)`;
    const rows = await db
        .select({
            id: payments.id,
            ownerId: payments.ownerId,
            ownerName: owners.fullName,
            unitNumber: units.unitNumber,
            paymentDate: payments.paymentDate,
            periodYear: payments.periodYear,
            periodMonth: payments.periodMonth,
            amount: payments.amount,
            allocated,
            method: payments.paymentMethod,
            referenceNo: payments.referenceNo,
            status: payments.status,
        })
        .from(payments)
        .leftJoin(units, and(eq(units.id, payments.unitId), eq(units.tenantId, tenantId)))
        .leftJoin(owners, and(eq(owners.id, payments.ownerId), eq(owners.tenantId, tenantId)))
        .where(eq(payments.tenantId, tenantId))
        .orderBy(desc(payments.paymentDate));

    return rows.map((row) => {
        const amount = moneyToCents(row.amount);
        const applied = moneyToCents(row.allocated);
        return {
            id: row.id,
            ownerId: row.ownerId,
            ownerName: row.ownerName,
            unitNumber: row.unitNumber,
            paymentDate: isoDate(new Date(row.paymentDate)),
            periodYear: row.periodYear,
            periodMonth: row.periodMonth,
            amount: toMoney(amount),
            allocated: toMoney(applied),
            unallocated: row.status === "confirmed" ? toMoney(Math.max(0, amount - applied)) : 0,
            method: row.method,
            referenceNo: row.referenceNo,
            status: row.status,
        };
    });
}

export type AdjustmentView = {
    id: string;
    chargeId: string;
    kind: AdjustmentKind;
    amount: number;
    reason: string;
    createdAt: string;
};

export type OwnerLedger = {charges: ChargeView[]; payments: PaymentView[]; adjustments: AdjustmentView[]};

export async function getOwnerLedger(tenantId: string, ownerId: string): Promise<OwnerLedger> {
    const [chargeRows, paymentRows, adjustmentRows] = await Promise.all([
        listChargeViews(tenantId),
        listPaymentViews(tenantId),
        db
            .select({
                id: adjustments.id,
                chargeId: adjustments.chargeId,
                kind: adjustments.kind,
                amount: adjustments.amount,
                reason: adjustments.reason,
                createdAt: adjustments.createdAt,
            })
            .from(adjustments)
            .innerJoin(chargesTable, eq(chargesTable.id, adjustments.chargeId))
            .where(and(eq(adjustments.tenantId, tenantId), eq(chargesTable.ownerId, ownerId)))
            .orderBy(desc(adjustments.createdAt)),
    ]);

    return {
        charges: chargeRows.filter((row) => row.ownerId === ownerId),
        payments: paymentRows.filter((row) => row.ownerId === ownerId),
        adjustments: adjustmentRows.map((row) => ({
            ...row,
            amount: moneyToCents(row.amount) / 100,
            createdAt: row.createdAt.toISOString(),
        })),
    };
}

export type OverviewData = {
    kpi: {
        charged: number;
        paid: number;
        outstanding: number;
        overdue: number;
        cash: number;
        collectionRate: number;
    };
    monthly: {month: string; charged: number; paid: number}[];
    cashflow: {month: string; inflow: number; outflow: number}[];
    ageing: AgeingBuckets;
    actions: {
        overdueDebtors: number;
        overdueAmount: number;
        unallocated: number;
        upcomingCount: number;
        upcomingAmount: number;
    };
    activity: {id: string; kind: "charge" | "payment"; date: string; title: string; amount: number; status: string}[];
};

function monthRange(from: string, to: string): {key: string; start: Date; end: Date}[] {
    const now = new Date();
    const end = to ? new Date(`${to}T23:59:59`) : now;
    const start = from ? new Date(`${from}T00:00:00`) : new Date(end.getFullYear(), end.getMonth() - 5, 1);
    const months: {key: string; start: Date; end: Date}[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end && months.length < 12) {
        months.push({
            key: periodKey(cursor.getFullYear(), cursor.getMonth() + 1),
            start: new Date(cursor),
            end: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59),
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
}

/** Single source for the finance overview; every KPI here matches the detail pages. */
export async function getOverviewData(tenantId: string, from: string, to: string): Promise<OverviewData> {
    const [balances, paymentRows, expenseRows, debtorRows, advances, budget] = await Promise.all([
        loadChargeBalances(tenantId),
        listPaymentViews(tenantId),
        listExpenses(tenantId, 500),
        listDebtors(tenantId),
        getAdvanceBalance(tenantId),
        getBuildingBudget(tenantId),
    ]);

    const today = new Date();
    const todayKey = isoDate(today);
    const inRange = (date: string) => (!from || date >= from) && (!to || date <= to);

    const months = monthRange(from, to);
    const monthly = months.map((month) => ({
        month: month.key,
        charged: toMoney(balances
            .filter((balance) => periodKey(balance.periodYear, balance.periodMonth) === month.key)
            .reduce((sum, balance) => sum + netDueCents(balance), 0)),
        paid: toMoney(paymentRows
            .filter((payment) => payment.status === "confirmed" && payment.paymentDate >= isoDate(month.start) && payment.paymentDate <= isoDate(month.end))
            .reduce((sum, payment) => sum + moneyToCents(payment.amount), 0)),
    }));

    const cashflow = months.map((month) => {
        const fromKey = isoDate(month.start);
        const toKey = isoDate(month.end);
        const inflow = paymentRows
            .filter((payment) => payment.status === "confirmed" && payment.paymentDate >= fromKey && payment.paymentDate <= toKey)
            .reduce((sum, payment) => sum + moneyToCents(payment.amount), 0);
        const outflow = expenseRows
            .filter((expense) => expense.expenseDate >= fromKey && expense.expenseDate <= toKey)
            .reduce((sum, expense) => sum + moneyToCents(expense.amount), 0);
        return {month: month.key, inflow: toMoney(inflow), outflow: toMoney(outflow)};
    });

    const periodCharged = monthly.reduce((sum, month) => sum + moneyToCents(month.charged), 0);
    const periodPaid = monthly.reduce((sum, month) => sum + moneyToCents(month.paid), 0);

    let outstanding = 0;
    let overdue = 0;
    const ageing: AgeingBuckets = {notDue: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0};
    let upcomingCount = 0;
    let upcomingAmount = 0;
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 14);
    const soonKey = isoDate(soon);

    for (const balance of balances) {
        const due = outstandingCents(balance);
        if (due <= 0) continue;
        outstanding += due;
        if (balance.dueDate < todayKey) {
            overdue += due;
            ageing[ageBucket(daysOverdue(balance.dueDate, today))] += due;
        } else {
            ageing.notDue += due;
        }
    }

    for (const balance of balances) {
        const due = outstandingCents(balance);
        if (due <= 0 || balance.dueDate < todayKey || balance.dueDate > soonKey) continue;
        upcomingCount += 1;
        upcomingAmount += due;
    }

    const cash = moneyToCents(budget.balance);
    const activity = [
        ...paymentRows.filter((payment) => inRange(payment.paymentDate)).map((payment) => ({
            id: `payment-${payment.id}`,
            kind: "payment" as const,
            date: payment.paymentDate,
            title: `${payment.ownerName ?? "—"} · ${payment.unitNumber ?? ""}`,
            amount: payment.amount,
            status: payment.status,
        })),
        ...balances.filter((balance) => inRange(balance.dueDate)).map((balance) => ({
            id: `charge-${balance.id}`,
            kind: "charge" as const,
            date: balance.dueDate,
            title: `${balance.ownerName ?? "—"} · ${balance.unitNumber ?? ""}`,
            amount: toMoney(netDueCents(balance)),
            status: resolveChargeStatus(balance, today),
        })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

    return {
        kpi: {
            charged: toMoney(periodCharged),
            paid: toMoney(periodPaid),
            outstanding: toMoney(outstanding),
            overdue: toMoney(overdue),
            cash: toMoney(cash),
            collectionRate: periodCharged > 0 ? Math.round((periodPaid / periodCharged) * 1000) / 10 : 0,
        },
        monthly,
        cashflow,
        ageing: {
            notDue: toMoney(ageing.notDue),
            days1to30: toMoney(ageing.days1to30),
            days31to60: toMoney(ageing.days31to60),
            days61to90: toMoney(ageing.days61to90),
            over90: toMoney(ageing.over90),
        },
        actions: {
            overdueDebtors: debtorRows.length,
            overdueAmount: toMoney(overdue),
            unallocated: moneyToCents(advances) / 100,
            upcomingCount,
            upcomingAmount: toMoney(upcomingAmount),
        },
        activity,
    };
}
