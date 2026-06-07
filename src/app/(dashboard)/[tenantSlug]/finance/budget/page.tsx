import { ensureTenantExists } from "@/core/multi-tenant";
import { db } from "@/core/db";
import { budgets, budgetItems } from "@/core/db/schema/budgets";
import { eq } from "drizzle-orm";

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenantId = await ensureTenantExists(tenantSlug);

  const incomeCodes = ["4010", "4020", "4030", "4040", "4050", "4090"];
  const expenseCodes = ["5010", "5011", "5012", "5020", "5030", "5040", "5050", "5060", "5070", "5080", "5090", "5100", "5990", "5991", "3020"];

  const budget = (await db.select().from(budgets).where(eq(budgets.tenantId, tenantId)).limit(1))[0];
  if (!budget) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Бюджет</h1>
        <p className="text-sm text-zinc-400">Бюджет не утверждён</p>
      </div>
    );
  }

  const allItems = await db
    .select()
    .from(budgetItems)
    .where(eq(budgetItems.budgetId, budget.id))
    .orderBy(budgetItems.accountCode);

  const incomeItems = allItems.filter((i) => incomeCodes.includes(i.accountCode));
  const expenseItems = allItems.filter((i) => expenseCodes.includes(i.accountCode));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Бюджет {budget.year}</h1>
        <p className="text-sm text-zinc-500">Aylıq Xərclər və Gəlirlər Smetası</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-4 text-sm font-semibold text-green-700 dark:text-green-400">GƏLİRLƏR (Доходы)</h2>
          <div className="space-y-2">
            {incomeItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <span className="text-zinc-500">{item.accountCode}</span>
                  {" — "}
                  <span>{item.notes}</span>
                </div>
                <span className="ml-4 font-medium tabular-nums">{Number(item.plannedAmount).toFixed(2)} AZN</span>
              </div>
            ))}
            <div className="border-t border-zinc-200 pt-2 flex items-center justify-between text-sm font-bold dark:border-zinc-700">
              <span>CƏMİ</span>
              <span>{Number(budget.totalIncome).toFixed(2)} AZN</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-4 text-sm font-semibold text-red-700 dark:text-red-400">XƏRCLƏR (Расходы)</h2>
          <div className="space-y-2">
            {expenseItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <span className="text-zinc-500">{item.accountCode}</span>
                  {" — "}
                  <span>{item.notes}</span>
                </div>
                <span className="ml-4 font-medium tabular-nums">{Number(item.plannedAmount).toFixed(2)} AZN</span>
              </div>
            ))}
            <div className="border-t border-zinc-200 pt-2 flex items-center justify-between text-sm font-bold dark:border-zinc-700">
              <span>CƏMİ</span>
              <span>{Number(budget.totalExpense).toFixed(2)} AZN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
