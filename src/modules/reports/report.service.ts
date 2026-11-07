import {and, desc, eq} from "drizzle-orm";
import {listAuditLogs} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {expenses} from "@/core/db/schema/expenses";
import {payments} from "@/core/db/schema/payments";
import {ageBucket} from "@/modules/finance/ageing";
import {formatAmount} from "@/modules/finance/money-format";
import {periodKey} from "@/modules/finance/period";
import {loadChargeBalances, netDueCents, outstandingCents, type ChargeBalance} from "@/modules/finance/services/debt.service";
import {daysOverdue} from "@/modules/finance/services/finance-analytics.service";
import {centsToMoney, moneyToCents} from "@/modules/finance/services/money";

export type DebtByOwnerRow = {
  ownerName: string;
  units: string;
  charged: string;
  paid: string;
  debt: string;
};

/**
 * Pure per-owner aggregation over the canonical charge balances. Amounts are summed in whole cents
 * and only formatted for display. Sorted by outstanding debt, largest first.
 */
export function debtRowsByOwner(
  balances: ChargeBalance[],
  confirmedPaidByOwner: ReadonlyMap<string, number>,
): DebtByOwnerRow[] {
  const byOwner = new Map<string, { ownerName: string; units: Set<string>; chargedCents: number; debtCents: number }>();

  for (const balance of balances) {
    const entry = byOwner.get(balance.ownerId) ?? {
      ownerName: balance.ownerName ?? "—",
      units: new Set<string>(),
      chargedCents: 0,
      debtCents: 0,
    };
    entry.units.add(balance.unitNumber ?? "—");
    entry.chargedCents += netDueCents(balance);
    entry.debtCents += outstandingCents(balance);
    byOwner.set(balance.ownerId, entry);
  }

  return [...byOwner.entries()]
    .sort(([, a], [, b]) => b.debtCents - a.debtCents)
    .map(([ownerId, entry]) => ({
      ownerName: entry.ownerName,
      units: [...entry.units].join(", "),
      charged: formatAmount(centsToMoney(entry.chargedCents)),
      paid: formatAmount(centsToMoney(confirmedPaidByOwner.get(ownerId) ?? 0)),
      debt: formatAmount(centsToMoney(entry.debtCents)),
    }));
}

/** Per-owner debt on canonical charge balances: net due and outstanding per owner. */
export async function getDebtByOwnerReport(tenantId: string): Promise<DebtByOwnerRow[]> {
  const [balances, confirmedPaidByOwner] = await Promise.all([
    loadChargeBalances(tenantId),
    confirmedPaymentsByOwner(tenantId),
  ]);
  return debtRowsByOwner(balances, confirmedPaidByOwner);
}

async function confirmedPaymentsByOwner(tenantId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ ownerId: payments.ownerId, amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.status, "confirmed")));

  const paid = new Map<string, number>();
  for (const payment of rows) {
    paid.set(payment.ownerId, (paid.get(payment.ownerId) ?? 0) + moneyToCents(payment.amount));
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
    const date = new Date(payment.paymentDate);
    const month = periodKey(date.getFullYear(), date.getMonth() + 1);
    incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + moneyToCents(payment.amount));
  }

  const recentMonths = [...incomeByMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12);
  const monthlyIncome = recentMonths.map(([month, cents]) => ({ month, amount: formatAmount(centsToMoney(cents)) }));

  const expenseRows = await db
    .select({ description: expenses.description, amount: expenses.amount, expenseDate: expenses.expenseDate })
    .from(expenses)
    .where(eq(expenses.tenantId, tenantId))
    .orderBy(desc(expenses.expenseDate));

  const expenseList = expenseRows.map((row) => ({
    date: row.expenseDate,
    notes: row.description,
    amount: formatAmount(centsToMoney(moneyToCents(row.amount))),
  }));

  const totalIncome = recentMonths.reduce((sum, [, cents]) => sum + cents, 0);
  const totalExpense = expenseRows.reduce((sum, row) => sum + moneyToCents(row.amount), 0);

  return {
    monthlyIncome,
    expenses: expenseList,
    totalIncome: formatAmount(centsToMoney(totalIncome)),
    totalExpense: formatAmount(centsToMoney(totalExpense)),
    balance: formatAmount(centsToMoney(totalIncome - totalExpense)),
  };
}

export async function getDebtAgingReport(tenantId: string) {
  const balances = await loadChargeBalances(tenantId);
  const now = new Date();
  const buckets: {key: "notDue" | "days1to30" | "days31to90" | "over90"; total: number; count: number}[] = [
    { key: "notDue", total: 0, count: 0 },
    { key: "days1to30", total: 0, count: 0 },
    { key: "days31to90", total: 0, count: 0 },
    { key: "over90", total: 0, count: 0 },
  ];

  for (const balance of balances) {
    const due = outstandingCents(balance);
    if (due <= 0) continue;
    const key = ageBucket(daysOverdue(balance.dueDate, now));
    const bucket = buckets.find((candidate) =>
      key === "days31to60" || key === "days61to90" ? candidate.key === "days31to90" : candidate.key === key,
    ) ?? buckets[0]!;
    bucket.total += due;
    bucket.count += 1;
  }

  return {
    buckets: buckets.map((bucket) => ({ key: bucket.key, total: formatAmount(centsToMoney(bucket.total)), count: bucket.count })),
    total: formatAmount(centsToMoney(buckets.reduce((sum, bucket) => sum + bucket.total, 0))),
  };
}

export async function getAuditReport(tenantId: string) {
  const logs = await listAuditLogs(tenantId);
  return logs.map((log) => ({...log, createdAt: log.createdAt.toISOString()}));
}
