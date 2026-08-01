import {db} from "@/core/db";
import {budgetItems, budgets} from "@/core/db/schema/budgets";
import {payments} from "@/core/db/schema/payments";
import {auditLogs} from "@/core/db/schema/audit-logs";
import {users} from "@/core/db/schema/users";
import {and, eq, desc, inArray, sum} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {isExpenseCode, isIncomeCode} from "@/modules/finance/constants";

export async function getBudget(tenantId: string) {
  const [b] = await db
    .select()
    .from(budgets)
    .where(eq(budgets.tenantId, tenantId))
    .limit(1);
  return b ?? null;
}

export async function createBudget(
  tenantId: string,
  year: number,
  userId: string,
) {
  const [existing] = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(and(eq(budgets.tenantId, tenantId), eq(budgets.year, year)))
    .limit(1);
  if (existing) throw new Error(`Бюджет на ${year} год уже существует`);

  const [b] = await db.insert(budgets).values({
    tenantId,
    year,
    status: "draft",
    totalIncome: "0",
    totalExpense: "0",
  }).returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "budget",
    entityId: b.id,
    newValues: { year },
  });

  return b;
}

export async function updateBudgetStatus(
  tenantId: string,
  budgetId: string,
  status: "draft" | "pending_approval" | "approved" | "rejected",
  userId: string,
) {
  const [b] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.tenantId, tenantId)))
    .limit(1);
  if (!b) throw new Error("Бюджет не найден");

  const allowedTransitions: Record<string, string[]> = {
    draft: ["pending_approval"],
    pending_approval: ["approved", "rejected", "draft"],
    rejected: ["draft", "pending_approval"],
    approved: [],
  };
  if (b.status === status) throw new Error("Бюджет уже находится в этом статусе");
  if (!allowedTransitions[b.status ?? "draft"]?.includes(status)) {
    throw new Error(`Недопустимый переход бюджета: ${b.status} → ${status}`);
  }

  const update: Record<string, unknown> = { status };
  if (status === "approved") {
    update.approvedBy = userId;
    update.approvedAt = new Date();
  }

  if (b.status === "approved" && status !== "approved") {
    throw new Error("Утверждённый бюджет нельзя изменить");
  }
  await db.update(budgets).set(update).where(and(eq(budgets.id, budgetId), eq(budgets.tenantId, tenantId)));

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "budget",
    entityId: budgetId,
    oldValues: { status: b.status },
    newValues: { status },
  });
}

export async function getBudgetItems(budgetId: string, tenantId: string) {
  const [b] = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.tenantId, tenantId)))
    .limit(1);
  if (!b) throw new Error("Бюджет не найден");

  return await db
    .select()
    .from(budgetItems)
    .where(eq(budgetItems.budgetId, budgetId))
    .orderBy(budgetItems.accountCode);
}

export async function addBudgetItem(
  tenantId: string,
  budgetId: string,
  input: {
    accountCode: string;
    plannedAmount: string;
    notes?: string;
  },
  userId: string,
) {
  const [b] = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.tenantId, tenantId)))
    .limit(1);
  if (!b) throw new Error("Бюджет не найден");

  const [item] = await db.insert(budgetItems).values({
    budgetId,
    accountCode: input.accountCode,
    plannedAmount: input.plannedAmount,
    notes: input.notes ?? null,
  }).returning();

  await recalcBudgetTotals(budgetId);
  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "budget_item",
    entityId: item.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return item;
}

export async function updateBudgetItem(
  tenantId: string,
  budgetId: string,
  itemId: string,
  input: {
    plannedAmount?: string;
    notes?: string;
  },
  userId: string,
) {
  const [budget] = await db
    .select({ id: budgets.id, status: budgets.status })
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.tenantId, tenantId)))
    .limit(1);
  if (!budget) throw new Error("Бюджет не найден");
  if (budget.status === "approved") throw new Error("Утверждённый бюджет нельзя изменять");

  const [item] = await db
    .select()
    .from(budgetItems)
    .where(and(
      eq(budgetItems.id, itemId),
      eq(budgetItems.budgetId, budgetId),
    ))
    .limit(1);
  if (!item) throw new Error("Статья не найдена");

  await db.update(budgetItems).set(input).where(and(eq(budgetItems.id, itemId), eq(budgetItems.budgetId, budgetId)));
  await recalcBudgetTotals(budgetId);

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "budget_item",
    entityId: itemId,
    oldValues: { plannedAmount: item.plannedAmount, notes: item.notes },
    newValues: input as unknown as Record<string, unknown>,
  });
}

export async function deleteBudgetItem(
  tenantId: string,
  budgetId: string,
  itemId: string,
  userId: string,
) {
  const [budget] = await db
    .select({ id: budgets.id, status: budgets.status })
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.tenantId, tenantId)))
    .limit(1);
  if (!budget) throw new Error("Бюджет не найден");
  if (budget.status === "approved") throw new Error("Утверждённый бюджет нельзя изменять");

  const [item] = await db
    .select()
    .from(budgetItems)
    .where(and(
      eq(budgetItems.id, itemId),
      eq(budgetItems.budgetId, budgetId),
    ))
    .limit(1);
  if (!item) throw new Error("Статья не найдена");

  await db.delete(budgetItems).where(and(eq(budgetItems.id, itemId), eq(budgetItems.budgetId, budgetId)));
  await recalcBudgetTotals(budgetId);

  await writeAuditLog({
    tenantId,
    userId,
    action: "delete",
    entityType: "budget_item",
    entityId: itemId,
    oldValues: { accountCode: item.accountCode, plannedAmount: item.plannedAmount },
  });
}

async function recalcBudgetTotals(budgetId: string) {
  const allItems = await db
    .select({ accountCode: budgetItems.accountCode, plannedAmount: budgetItems.plannedAmount })
    .from(budgetItems)
    .where(eq(budgetItems.budgetId, budgetId));

  let incomeSum = 0;
  let expenseSum = 0;
  for (const item of allItems) {
    const amount = Number(item.plannedAmount);
    if (isIncomeCode(item.accountCode)) {
      incomeSum += amount;
    } else if (isExpenseCode(item.accountCode)) {
      expenseSum += amount;
    }
  }

  await db
    .update(budgets)
    .set({
      totalIncome: incomeSum.toFixed(2),
      totalExpense: expenseSum.toFixed(2),
    })
    .where(eq(budgets.id, budgetId));
}

export async function getMonthlyFeeIncome(tenantId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [result] = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .where(and(
      eq(payments.tenantId, tenantId),
      eq(payments.periodYear, year),
      eq(payments.periodMonth, month),
      eq(payments.status, "confirmed"),
    ));

  return result?.total ?? "0";
}

export async function getBudgetHistory(tenantId: string, budgetId: string) {
  const itemIds = await db
    .select({ id: budgetItems.id })
    .from(budgetItems)
    .where(eq(budgetItems.budgetId, budgetId));

  const entityIds = [budgetId, ...itemIds.map((i) => i.id)];

  if (entityIds.length === 0) return [];

  return await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      createdAt: auditLogs.createdAt,
      userName: users.fullName,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .where(and(
      eq(auditLogs.tenantId, tenantId),
      inArray(auditLogs.entityId, entityIds),
    ))
    .orderBy(desc(auditLogs.createdAt))
    .limit(30);
}
