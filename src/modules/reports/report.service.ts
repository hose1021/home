import {and, desc, eq, inArray, sql} from "drizzle-orm";
import {db} from "@/core/db";
import {auditLogs} from "@/core/db/schema/audit-logs";
import {charges} from "@/core/db/schema/charges";
import {funds} from "@/core/db/schema/funds";
import {owners, ownerships} from "@/core/db/schema/owners";
import {payments} from "@/core/db/schema/payments";
import {units} from "@/core/db/schema/units";
import {users} from "@/core/db/schema/users";
import {isExpenseCode, isIncomeCode} from "@/modules/finance/constants";
import {getBudget, getBudgetItems} from "@/modules/finance/services/budget.service";
import {buildPeriods, getDebtConfig, unitDebt, type DebtConfig} from "@/modules/finance/services/debt.service";
import {formatMoney, moneyToCents} from "@/modules/finance/services/money";

const DEBT_STATUSES = ["pending", "partially_paid", "overdue"] as const;

export type DebtByOwnerRow = {
  ownerName: string;
  units: string;
  charged: string;
  paid: string;
  debt: string;
};

type DebtUnitRow = {
  ownerId: string;
  ownerName: string;
  unitId: string;
  unitNumber: string | null;
  area: string;
};

/** Confirmed paid per unit per period (unitId → "YYYY-M" → manat float), same shape debt.service builds. */
type PaidByUnitPeriod = ReadonlyMap<string, ReadonlyMap<string, number>>;

/**
 * Pure per-owner debt aggregation over the canonical tariff × area accrual.
 * Monetary accumulations stay in manat floats (matching unitDebt) and are converted to cents only for display.
 */
export function computeDebtByOwner(
  unitRows: DebtUnitRow[],
  paidByUnitPeriod: PaidByUnitPeriod,
  confirmedPaidByOwner: ReadonlyMap<string, number>,
  cfg: DebtConfig,
  now: Date = new Date(),
): DebtByOwnerRow[] {
  const periods = buildPeriods(cfg.billingStart, now);
  const byOwner = new Map<string, { ownerName: string; units: Set<string>; charged: number; paid: number; debt: number }>();

  for (const row of unitRows) {
    const entry = byOwner.get(row.ownerId) ?? {
      ownerName: row.ownerName,
      units: new Set<string>(),
      charged: 0,
      paid: 0,
      debt: 0,
    };
    entry.units.add(row.unitNumber ?? "—");
    const monthlyFee = Number(row.area) * cfg.tariffPerSqm;
    entry.charged += monthlyFee * periods.length;
    entry.debt += unitDebt(monthlyFee, periods, (p) => paidByUnitPeriod.get(row.unitId)?.get(`${p.year}-${p.month}`) ?? 0);
    entry.paid = confirmedPaidByOwner.get(row.ownerId) ?? 0;
    byOwner.set(row.ownerId, entry);
  }

  return [...byOwner.values()]
    .map((entry) => ({
      ownerName: entry.ownerName,
      units: [...entry.units].join(", "),
      charged: formatMoney(moneyToCents(entry.charged)),
      paid: formatMoney(moneyToCents(entry.paid)),
      debt: formatMoney(moneyToCents(entry.debt)),
    }))
    .sort((a, b) => Number(b.debt) - Number(a.debt));
}

/** Per-owner debt on canonical semantics: Σ over billing periods of max(0, tariff × area − confirmed paid). */
export async function getDebtByOwnerReport(tenantId: string): Promise<DebtByOwnerRow[]> {
  const cfg = getDebtConfig();

  const unitRows = await db
    .select({
      ownerId: ownerships.ownerId,
      ownerName: owners.fullName,
      unitId: units.id,
      unitNumber: units.unitNumber,
      area: units.area,
    })
    .from(ownerships)
    .innerJoin(units, and(eq(units.id, ownerships.unitId), eq(units.tenantId, tenantId)))
    .innerJoin(owners, and(eq(owners.id, ownerships.ownerId), eq(owners.tenantId, tenantId)))
    .where(and(eq(ownerships.tenantId, tenantId), eq(units.status, "active")));

  const [paidByUnitPeriod, confirmedPaidByOwner] = await Promise.all([
    confirmedPaidByUnitPeriod(tenantId, unitRows.map((r) => r.unitId)),
    confirmedPaymentsByOwner(tenantId),
  ]);

  return computeDebtByOwner(unitRows, paidByUnitPeriod, confirmedPaidByOwner, cfg);
}

async function confirmedPaidByUnitPeriod(tenantId: string, unitIds: string[]): Promise<PaidByUnitPeriod> {
  const rows = unitIds.length === 0 ? [] : await db
    .select({
      unitId: payments.unitId,
      periodYear: payments.periodYear,
      periodMonth: payments.periodMonth,
      paid: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)`,
    })
    .from(payments)
    .where(and(
      eq(payments.tenantId, tenantId),
      eq(payments.status, "confirmed"),
      inArray(payments.unitId, unitIds),
    ))
    .groupBy(payments.unitId, payments.periodYear, payments.periodMonth);

  const map = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const inner = map.get(r.unitId) ?? new Map<string, number>();
    inner.set(`${r.periodYear}-${r.periodMonth}`, Number(r.paid));
    map.set(r.unitId, inner);
  }
  return map;
}

async function confirmedPaymentsByOwner(tenantId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ ownerId: payments.ownerId, amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.status, "confirmed")));

  const paid = new Map<string, number>();
  for (const payment of rows) {
    paid.set(payment.ownerId, (paid.get(payment.ownerId) ?? 0) + Number(payment.amount));
  }
  return paid;
}

export async function getIncomeExpenseReport(tenantId: string) {
  const confirmedPayments = await db
    .select({ amount: payments.amount, paymentDate: payments.paymentDate })
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.status, "confirmed")));

  const incomeByMonth = new Map<string, number>();
  for (const payment of confirmedPayments) {
    const month = payment.paymentDate.toISOString().slice(0, 7);
    incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + moneyToCents(payment.amount));
  }

  const monthlyIncome = [...incomeByMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, cents]) => ({ month, amount: formatMoney(cents) }));

  const budget = await getBudget(tenantId);
  const items = budget ? await getBudgetItems(budget.id, tenantId) : [];

  const expenses = items
    .filter((item) => isExpenseCode(item.accountCode))
    .map((item) => ({
      accountCode: item.accountCode,
      notes: item.notes ?? "",
      amount: formatMoney(moneyToCents(item.actualAmount)),
    }));

  const totalIncome = monthlyIncome.reduce((sum, row) => sum + moneyToCents(row.amount), 0);
  const totalExpense = expenses.reduce((sum, row) => sum + moneyToCents(row.amount), 0);

  return {
    monthlyIncome,
    expenses,
    totalIncome: formatMoney(totalIncome),
    totalExpense: formatMoney(totalExpense),
    balance: formatMoney(totalIncome - totalExpense),
  };
}

export async function getBudgetVsActualReport(tenantId: string) {
  const budget = await getBudget(tenantId);
  if (!budget) {
    return { rows: [], totalPlanned: "0.00", totalActual: "0.00" };
  }

  const items = await getBudgetItems(budget.id, tenantId);
  const rows = items.map((item) => {
    const planned = moneyToCents(item.plannedAmount);
    const actual = moneyToCents(item.actualAmount);
    return {
      accountCode: item.accountCode,
      notes: item.notes ?? "",
      kind: isIncomeCode(item.accountCode) ? "Доход" : isExpenseCode(item.accountCode) ? "Расход" : "Прочее",
      planned: formatMoney(planned),
      actual: formatMoney(actual),
      diff: formatMoney(actual - planned),
    };
  });

  const totalPlanned = rows.reduce((sum, row) => sum + moneyToCents(row.planned), 0);
  const totalActual = rows.reduce((sum, row) => sum + moneyToCents(row.actual), 0);

  return { rows, totalPlanned: formatMoney(totalPlanned), totalActual: formatMoney(totalActual) };
}

export async function getFundsReport(tenantId: string) {
  const rows = await db
    .select()
    .from(funds)
    .where(eq(funds.tenantId, tenantId))
    .orderBy(funds.name);

  return rows.map((fund) => {
    const target = fund.targetAmount ? moneyToCents(fund.targetAmount) : null;
    const current = moneyToCents(fund.currentBalance);
    return {
      name: fund.name,
      type: fund.type,
      target: target === null ? null : formatMoney(target),
      current: formatMoney(current),
      filledPercent: target && target > 0 ? Math.min(100, (current / target) * 100) : null,
    };
  });
}

export async function getDebtAgingReport(tenantId: string) {
  const rows = await db
    .select({ amount: charges.amount, dueDate: charges.dueDate })
    .from(charges)
    .where(and(
      eq(charges.tenantId, tenantId),
      inArray(charges.status, DEBT_STATUSES),
    ));

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const buckets = [
    { key: "current", label: "Не просрочено", total: 0, count: 0 },
    { key: "d30", label: "1–30 дней", total: 0, count: 0 },
    { key: "d90", label: "31–90 дней", total: 0, count: 0 },
    { key: "d90plus", label: "Более 90 дней", total: 0, count: 0 },
  ];

  for (const row of rows) {
    const due = new Date(`${row.dueDate}T00:00:00`).getTime();
    const days = Math.floor((now - due) / dayMs);
    const cents = moneyToCents(row.amount);
    const bucket = days <= 0 ? buckets[0]! : days <= 30 ? buckets[1]! : days <= 90 ? buckets[2]! : buckets[3]!;
    bucket.total += cents;
    bucket.count += 1;
  }

  return {
    buckets: buckets.map((bucket) => ({ label: bucket.label, total: formatMoney(bucket.total), count: bucket.count })),
    total: formatMoney(buckets.reduce((sum, bucket) => sum + bucket.total, 0)),
  };
}

export async function getAuditReport(tenantId: string) {
  const logs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      createdAt: auditLogs.createdAt,
      userName: users.fullName,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  return logs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString() }));
}
