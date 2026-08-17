import {and, desc, eq, inArray} from "drizzle-orm";
import {db} from "@/core/db";
import {charges} from "@/core/db/schema/charges";
import {payments} from "@/core/db/schema/payments";
import {owners} from "@/core/db/schema/owners";
import {units} from "@/core/db/schema/units";
import {funds} from "@/core/db/schema/funds";
import {auditLogs} from "@/core/db/schema/audit-logs";
import {users} from "@/core/db/schema/users";
import {getBudget, getBudgetItems} from "@/modules/finance/services/budget.service";
import {isExpenseCode, isIncomeCode} from "@/modules/finance/constants";

const DEBT_STATUSES = ["pending", "partially_paid", "overdue"] as const;

function moneyToCents(value: string | number): number {
  const cents = Math.round(Number(value) * 100);
  return Number.isFinite(cents) ? cents : 0;
}

function formatMoney(cents: number): string {
  return (cents / 100).toFixed(2);
}

export async function getDebtByOwnerReport(tenantId: string) {
  const rows = await db
    .select({
      ownerId: charges.ownerId,
      ownerName: owners.fullName,
      unitNumber: units.unitNumber,
      amount: charges.amount,
    })
    .from(charges)
    .innerJoin(owners, eq(owners.id, charges.ownerId))
    .leftJoin(units, eq(units.id, charges.unitId))
    .where(and(
      eq(charges.tenantId, tenantId),
      inArray(charges.status, DEBT_STATUSES),
    ));

  const confirmedPayments = await db
    .select({ ownerId: payments.ownerId, amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.status, "confirmed")));

  const paidByOwner = new Map<string, number>();
  for (const payment of confirmedPayments) {
    paidByOwner.set(payment.ownerId, (paidByOwner.get(payment.ownerId) ?? 0) + moneyToCents(payment.amount));
  }

  const byOwner = new Map<string, { ownerName: string; units: Set<string>; charged: number; paid: number }>();
  for (const row of rows) {
    const entry = byOwner.get(row.ownerId) ?? { ownerName: row.ownerName, units: new Set<string>(), charged: 0, paid: 0 };
    entry.units.add(row.unitNumber ?? "—");
    entry.charged += moneyToCents(row.amount);
    entry.paid = paidByOwner.get(row.ownerId) ?? 0;
    byOwner.set(row.ownerId, entry);
  }

  return [...byOwner.values()]
    .map((entry) => ({
      ownerName: entry.ownerName,
      units: [...entry.units].join(", "),
      charged: formatMoney(entry.charged),
      paid: formatMoney(entry.paid),
      debt: formatMoney(Math.max(0, entry.charged - entry.paid)),
    }))
    .sort((a, b) => Number(b.debt) - Number(a.debt));
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
    const bucket = days <= 0 ? buckets[0] : days <= 30 ? buckets[1] : days <= 90 ? buckets[2] : buckets[3];
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
