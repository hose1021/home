import {and, desc, eq, sql} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {expenses} from "@/core/db/schema/expenses";
import {payments} from "@/core/db/schema/payments";

export type ExpenseRow = {
  id: string;
  amount: string;
  description: string;
  expenseDate: string;
};

/** Building payments for house services: security, lift, cleaning, repairs. */
export async function listExpenses(tenantId: string, limit = 200): Promise<ExpenseRow[]> {
  return await db
    .select({
      id: expenses.id,
      amount: expenses.amount,
      description: expenses.description,
      expenseDate: expenses.expenseDate,
    })
    .from(expenses)
    .where(eq(expenses.tenantId, tenantId))
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
    .limit(limit);
}

export async function createExpense(
  tenantId: string,
  input: {amount: string; description: string; expenseDate: string},
  userId: string,
) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be positive");
  if (!input.description.trim()) throw new Error("Description is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate)) throw new Error("Invalid expense date");

  const [created] = await db
    .insert(expenses)
    .values({
      tenantId,
      amount: amount.toFixed(2),
      description: input.description.trim(),
      expenseDate: input.expenseDate,
      createdBy: userId,
    })
    .returning();
  if (!created) throw new Error("Failed to create expense");

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "expense",
    entityId: created.id,
    newValues: {amount: created.amount, description: created.description, expenseDate: created.expenseDate},
  });

  return created;
}

export type BuildingBudget = {
  income: number;
  expenses: number;
  balance: number;
};

/** Building budget derives from owner payments minus service expenses; nothing else feeds it. */
export async function getBuildingBudget(tenantId: string): Promise<BuildingBudget> {
  const [incomeRow] = await db
    .select({total: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)`})
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.status, "confirmed")));
  const [expenseRow] = await db
    .select({total: sql<string>`coalesce(sum(${expenses.amount}::numeric), 0)`})
    .from(expenses)
    .where(eq(expenses.tenantId, tenantId));

  const income = Math.round(Number(incomeRow?.total ?? 0) * 100) / 100;
  const spent = Math.round(Number(expenseRow?.total ?? 0) * 100) / 100;
  return {income, expenses: spent, balance: Math.round((income - spent) * 100) / 100};
}
