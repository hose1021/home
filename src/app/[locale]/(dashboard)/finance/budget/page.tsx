import {requireTenantPermission} from "@/core/auth/session";
import {db} from "@/core/db";
import {budgetItems, budgets} from "@/core/db/schema/budgets";
import {eq} from "drizzle-orm";
import {isExpenseCode, isIncomeCode} from "@/modules/finance/constants";
import {getTranslations} from "next-intl/server";

export default async function BudgetPage() {
  const {tenantId} = await requireTenantPermission("budget:read");
  const t = await getTranslations("budget");

  const budget = (await db.select().from(budgets).where(eq(budgets.tenantId, tenantId)).limit(1))[0];
  if (!budget) {
    return (
      <div className="page-shell">
        <div>
          <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="page-heading mt-1">{t("title")}</h1>
          <p className="page-description">{t("notApproved")}</p>
        </div>
        <div className="surface-panel border-dashed p-10 text-center text-sm text-muted-foreground">{t("notApprovedHint")}</div>
      </div>
    );
  }

  const allItems = await db
    .select()
    .from(budgetItems)
    .where(eq(budgetItems.budgetId, budget.id))
    .orderBy(budgetItems.accountCode);

  const incomeItems = allItems.filter((i) => isIncomeCode(i.accountCode));
  const expenseItems = allItems.filter((i) => isExpenseCode(i.accountCode));

  return (
    <div className="page-shell">
      <div>
        <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="page-heading mt-1">{t("title")} {budget.year}</h1>
        <p className="page-description">{t("description")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-panel p-5">
          <h2 className="mb-4 text-sm font-semibold text-green-700 dark:text-green-400">{t("incomeHeading")}</h2>
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
              <span>{t("total")}</span>
              <span>{Number(budget.totalIncome).toFixed(2)} AZN</span>
            </div>
          </div>
        </div>

        <div className="surface-panel p-5">
          <h2 className="mb-4 text-sm font-semibold text-red-700 dark:text-red-400">{t("expenseHeading")}</h2>
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
              <span>{t("total")}</span>
              <span>{Number(budget.totalExpense).toFixed(2)} AZN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
