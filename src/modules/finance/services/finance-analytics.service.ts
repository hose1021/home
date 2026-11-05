import {and, desc, eq, ne, sql} from "drizzle-orm";
import {db} from "@/core/db";
import {adjustments} from "@/core/db/schema/adjustments";
import {paymentAllocations} from "@/core/db/schema/allocations";
import {charges} from "@/core/db/schema/charges";
import {owners} from "@/core/db/schema/owners";
import {payments} from "@/core/db/schema/payments";
import {units} from "@/core/db/schema/units";
import {users} from "@/core/db/schema/users";
import {getAdvanceBalance} from "./allocation.service";
import {getTenantDebtSummary} from "./debt.service";
import {getBuildingBudget, listExpenses} from "./expense.service";

export type AgeingBuckets = {
    notDue: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    over90: number;
};

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

export type FinanceReconciliation = {
    chargesTotal: number;
    allocatedTotal: number;
    confirmedPaymentsTotal: number;
    advanceTotal: number;
    creditTotal: number;
    debitTotal: number;
    computedOutstanding: number;
    ok: boolean;
};

type ChargeBalance = {
    id: string;
    ownerId: string;
    ownerName: string | null;
    unitId: string;
    dueDate: string;
    status: string;
    periodYear: number;
    periodMonth: number;
    unitNumber: string | null;
    amountCents: number;
    allocatedCents: number;
    creditCents: number;
    debitCents: number;
};

function balanceRows(tenantId: string) {
    const allocated = sql<string>`coalesce((select sum(${paymentAllocations.amount}::numeric)
        from ${paymentAllocations}
        where ${paymentAllocations.tenantId} = ${tenantId}
          and ${paymentAllocations.chargeId} = ${charges.id}), 0)`;
    const credit = sql<string>`coalesce((select sum(a.amount::numeric)
        from adjustments a
        where a.tenant_id = ${tenantId}
          and a.charge_id = ${charges.id}
          and a.kind = 'credit'), 0)`;
    const debit = sql<string>`coalesce((select sum(a.amount::numeric)
        from adjustments a
        where a.tenant_id = ${tenantId}
          and a.charge_id = ${charges.id}
          and a.kind = 'debit'), 0)`;

    return db
        .select({
            id: charges.id,
            ownerId: charges.ownerId,
            unitId: charges.unitId,
            dueDate: charges.dueDate,
            status: charges.status,
            periodYear: charges.periodYear,
            periodMonth: charges.periodMonth,
            unitNumber: units.unitNumber,
            ownerName: owners.fullName,
            amount: charges.amount,
            allocated,
            credit,
            debit,
        })
        .from(charges)
        .leftJoin(units, and(eq(units.id, charges.unitId), eq(units.tenantId, tenantId)))
        .leftJoin(owners, and(eq(owners.id, charges.ownerId), eq(owners.tenantId, tenantId)))
        .where(and(eq(charges.tenantId, tenantId), ne(charges.status, "cancelled")));
}

function cents(value: string | null): number {
    return Math.round(Number(value ?? 0) * 100);
}

async function loadBalances(tenantId: string): Promise<ChargeBalance[]> {
    const rows = await balanceRows(tenantId);
    return rows.map((row) => ({
        id: row.id,
        ownerId: row.ownerId,
        ownerName: row.ownerName,
        unitId: row.unitId,
        dueDate: row.dueDate,
        status: row.status,
        periodYear: row.periodYear,
        periodMonth: row.periodMonth,
        unitNumber: row.unitNumber,
        amountCents: cents(row.amount),
        allocatedCents: cents(row.allocated),
        creditCents: cents(row.credit),
        debitCents: cents(row.debit),
    }));
}

function netDueCents(balance: ChargeBalance): number {
    return Math.max(0, balance.amountCents + balance.debitCents - balance.creditCents);
}

function outstandingCents(balance: ChargeBalance): number {
    return Math.max(0, netDueCents(balance) - balance.allocatedCents);
}

function toMoney(centsValue: number): number {
    return Math.round(centsValue) / 100;
}

export function ageBucket(daysOverdue: number): keyof AgeingBuckets {
    if (daysOverdue <= 0) return "notDue";
    if (daysOverdue <= 30) return "days1to30";
    if (daysOverdue <= 60) return "days31to60";
    if (daysOverdue <= 90) return "days61to90";
    return "over90";
}

export function daysBetween(dueDate: string, today: Date): number {
    const due = Date.parse(`${dueDate}T00:00:00`);
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return Math.floor((now - due) / 86_400_000);
}

export async function getFinanceAnalytics(tenantId: string): Promise<FinanceAnalytics> {
    const [balances, advances] = await Promise.all([loadBalances(tenantId), getAdvanceBalance(tenantId)]);
    const today = new Date();

    let charged = 0;
    let paid = 0;
    let outstanding = 0;
    let debtors = 0;
    const seenDebtors = new Set<string>();
    const ageing: AgeingBuckets = {notDue: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0};

    for (const balance of balances) {
        charged += netDueCents(balance);
        paid += Math.min(balance.allocatedCents, netDueCents(balance));
        const due = outstandingCents(balance);
        outstanding += due;
        if (due > 0) {
            seenDebtors.add(balance.ownerId);
            ageing[ageBucket(daysBetween(balance.dueDate, today))] += due;
        }
    }
    debtors = seenDebtors.size;

    return {
        charged: toMoney(charged),
        paid: toMoney(paid),
        outstanding: toMoney(outstanding),
        advances: Math.round(advances * 100) / 100,
        collectionRate: charged > 0 ? Math.round((paid / charged) * 1000) / 10 : 0,
        chargesCount: balances.length,
        debtorsCount: debtors,
        ageing: {
            notDue: toMoney(ageing.notDue),
            days1to30: toMoney(ageing.days1to30),
            days31to60: toMoney(ageing.days31to60),
            days61to90: toMoney(ageing.days61to90),
            over90: toMoney(ageing.over90),
        },
    };
}

export async function listDebtors(tenantId: string): Promise<DebtorRow[]> {
    const [balances, ownerRows] = await Promise.all([
        loadBalances(tenantId),
        db
            .select({id: owners.id, fullName: users.fullName})
            .from(owners)
            .innerJoin(users, eq(users.id, owners.userId))
            .where(eq(owners.tenantId, tenantId)),
    ]);
    const ownerNames = new Map(ownerRows.map((row) => [row.id, row.fullName]));
    const today = new Date();
    const grouped = new Map<string, {outstanding: number; units: Set<string>; oldest: string | null}>();

    for (const balance of balances) {
        const due = outstandingCents(balance);
        if (due <= 0) continue;
        const entry = grouped.get(balance.ownerId) ?? {outstanding: 0, units: new Set<string>(), oldest: null};
        entry.outstanding += due;
        if (balance.unitNumber) entry.units.add(balance.unitNumber);
        if (!entry.oldest || balance.dueDate < entry.oldest) entry.oldest = balance.dueDate;
        grouped.set(balance.ownerId, entry);
    }

    return [...grouped.entries()]
        .map(([ownerId, entry]) => ({
            ownerId,
            ownerName: ownerNames.get(ownerId) ?? "—",
            unitNumbers: [...entry.units].sort((a, b) => a.localeCompare(b, "ru")),
            outstanding: toMoney(entry.outstanding),
            oldestDueDate: entry.oldest,
            daysOverdue: entry.oldest ? Math.max(0, daysBetween(entry.oldest, today)) : 0,
        }))
        .sort((a, b) => b.outstanding - a.outstanding);
}

/** Cross-checks the KPI sources: confirmed money must equal allocated money plus advances. */
export async function getFinanceReconciliation(tenantId: string): Promise<FinanceReconciliation> {
    const [balances, summary, advances, confirmed] = await Promise.all([
        loadBalances(tenantId),
        getTenantDebtSummary(tenantId),
        getAdvanceBalance(tenantId),
        db
            .select({total: sql<string>`coalesce(sum(${payments.amount}::numeric) filter (where ${payments.status} = 'confirmed'), 0)`})
            .from(payments)
            .where(eq(payments.tenantId, tenantId)),
    ]);

    let chargesTotal = 0;
    let creditTotal = 0;
    let debitTotal = 0;
    for (const balance of balances) {
        chargesTotal += netDueCents(balance);
        creditTotal += balance.creditCents;
        debitTotal += balance.debitCents;
    }
    const confirmedTotal = cents(confirmed[0]?.total ?? "0");
    const allocatedConfirmed = await db
        .select({total: sql<string>`coalesce(sum(${paymentAllocations.amount}::numeric), 0)`})
        .from(paymentAllocations)
        .innerJoin(payments, eq(payments.id, paymentAllocations.paymentId))
        .where(and(eq(paymentAllocations.tenantId, tenantId), eq(payments.status, "confirmed")));
    const allocatedConfirmedCents = cents(allocatedConfirmed[0]?.total ?? "0");

    return {
        chargesTotal: toMoney(chargesTotal),
        allocatedTotal: toMoney(allocatedConfirmedCents),
        confirmedPaymentsTotal: toMoney(confirmedTotal),
        advanceTotal: Math.round(advances * 100) / 100,
        creditTotal: toMoney(creditTotal),
        debitTotal: toMoney(debitTotal),
        computedOutstanding: summary.totalDebt,
        ok: Math.abs(confirmedTotal - allocatedConfirmedCents - Math.round(advances * 100)) < 5,
    };
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

export async function listChargeViews(tenantId: string): Promise<ChargeView[]> {
    const balances = await loadBalances(tenantId);
    const views = balances.map((balance) => ({
        id: balance.id,
        ownerId: balance.ownerId,
        ownerName: balance.ownerName,
        unitNumber: balance.unitNumber,
        dueDate: balance.dueDate,
        periodYear: balance.periodYear,
        periodMonth: balance.periodMonth,
        amount: toMoney(netDueCents(balance)),
        paid: toMoney(Math.min(balance.allocatedCents, netDueCents(balance))),
        outstanding: toMoney(outstandingCents(balance)),
        status: balance.status,
    }));
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
        const amount = cents(row.amount);
        const applied = cents(row.allocated);
        return {
            id: row.id,
            ownerId: row.ownerId,
            ownerName: row.ownerName,
            unitNumber: row.unitNumber,
            paymentDate: new Date(row.paymentDate).toISOString().slice(0, 10),
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
    kind: "credit" | "debit";
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
            .innerJoin(charges, eq(charges.id, adjustments.chargeId))
            .where(and(eq(adjustments.tenantId, tenantId), eq(charges.ownerId, ownerId)))
            .orderBy(desc(adjustments.createdAt)),
    ]);

    return {
        charges: chargeRows.filter((row) => row.ownerId === ownerId),
        payments: paymentRows.filter((row) => row.ownerId === ownerId),
        adjustments: adjustmentRows.map((row) => ({...row, amount: cents(row.amount) / 100, createdAt: row.createdAt.toISOString()})),
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
        const monthStart = new Date(cursor);
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
        months.push({
            key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
            start: monthStart,
            end: monthEnd,
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
}

/** Single source for the finance overview; every KPI here matches the detail pages. */
export async function getOverviewData(tenantId: string, from: string, to: string): Promise<OverviewData> {
    const [balances, paymentRows, expenseRows, debtorRows, advances, budget] = await Promise.all([
        loadBalances(tenantId),
        listPaymentViews(tenantId),
        listExpenses(tenantId, 500),
        listDebtors(tenantId),
        getAdvanceBalance(tenantId),
        getBuildingBudget(tenantId),
    ]);

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const inRange = (date: string) => (!from || date >= from) && (!to || date <= to);

    const months = monthRange(from, to);
    const monthly = months.map((month) => ({
        month: month.key,
        charged: toMoney(balances
            .filter((balance) => {
                const key = `${balance.periodYear}-${String(balance.periodMonth).padStart(2, "0")}`;
                return key === month.key;
            })
            .reduce((sum, balance) => sum + netDueCents(balance), 0)),
        paid: toMoney(paymentRows
            .filter((payment) => payment.status === "confirmed" && payment.paymentDate >= month.start.toISOString().slice(0, 10) && payment.paymentDate <= month.end.toISOString().slice(0, 10))
            .reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0)),
    }));

    const cashflow = months.map((month) => {
        const fromKey = month.start.toISOString().slice(0, 10);
        const toKey = month.end.toISOString().slice(0, 10);
        const inflow = paymentRows
            .filter((payment) => payment.status === "confirmed" && payment.paymentDate >= fromKey && payment.paymentDate <= toKey)
            .reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0);
        const outflow = expenseRows
            .filter((expense) => expense.expenseDate >= fromKey && expense.expenseDate <= toKey)
            .reduce((sum, expense) => sum + Math.round(Number(expense.amount) * 100), 0);
        return {month: month.key, inflow: toMoney(inflow), outflow: toMoney(outflow)};
    });

    const periodCharged = monthly.reduce((sum, month) => sum + Math.round(month.charged * 100), 0);
    const periodPaid = monthly.reduce((sum, month) => sum + Math.round(month.paid * 100), 0);

    let outstanding = 0;
    let overdue = 0;
    const ageing: AgeingBuckets = {notDue: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0};
    let upcomingCount = 0;
    let upcomingAmount = 0;
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 14);
    const soonKey = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, "0")}-${String(soon.getDate()).padStart(2, "0")}`;

    for (const balance of balances) {
        const due = outstandingCents(balance);
        if (due <= 0) continue;
        outstanding += due;
        if (balance.dueDate < todayKey) {
            overdue += due;
            ageing[ageBucket(daysBetween(balance.dueDate, today))] += due;
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

    const cash = Math.round(budget.balance * 100);
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
            status: balance.status,
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
            unallocated: Math.round(advances * 100) / 100,
            upcomingCount,
            upcomingAmount: toMoney(upcomingAmount),
        },
        activity,
    };
}
