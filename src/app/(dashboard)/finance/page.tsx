import {requireTenantPermission} from "@/core/auth/session";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {getBudget, getBudgetHistory, getBudgetItems, getMonthlyFeeIncome} from "@/modules/finance/services/budget.service";
import {BudgetTable} from "./budget-table";
import {BudgetCreateForm} from "./budget-create-form";
import {Badge} from "@/components/ui/badge";
import {BudgetActions} from "./budget-actions";
import {BudgetHistory} from "./budget-history";

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  pending_approval: "На утверждении",
  approved: "Утверждён",
  rejected: "Отклонён",
};

export default async function BudgetPage() {
  const { session, tenantId } = await requireTenantPermission("budget:read");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);
  const canEdit = permissions.includes("budget:write");

  const budget = await getBudget(tenantId);

  if (!budget) {
    return (
      <div className="page-shell">
        <div>
          <p className="text-sm text-muted-foreground">Финансовое планирование</p>
          <h1 className="page-heading mt-1">Бюджет</h1>
          <p className="page-description">Ежемесячный план доходов и расходов</p>
        </div>
        {canEdit ? (
          <BudgetCreateForm />
        ) : (
          <div className="surface-panel border-dashed p-10 text-center text-sm text-muted-foreground">
            Бюджет не создан. Обратитесь к администратору.
          </div>
        )}
      </div>
    );
  }

  const items = await getBudgetItems(budget.id, tenantId);
  const monthlyFeeIncome = await getMonthlyFeeIncome(tenantId);
  const history = await getBudgetHistory(tenantId, budget.id);
  const balance = Number(budget.totalIncome) - Number(budget.totalExpense);

  const statusVariant: Record<string, "secondary" | "outline" | "default" | "destructive"> = {
    draft: "secondary",
    pending_approval: "outline",
    approved: "default",
    rejected: "destructive",
  };

  return (
    <div className="page-shell max-w-6xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Финансовое планирование</p>
          <div className="flex items-center gap-3">
            <h1 className="page-heading mt-1">Бюджет {budget.year}</h1>
            <Badge variant={statusVariant[budget.status ?? "draft"] ?? "secondary"}>
              {STATUS_LABELS[budget.status ?? "draft"] ?? budget.status}
            </Badge>
          </div>
          <p className="page-description">План доходов и расходов на месяц</p>
        </div>
        {canEdit && (
          <BudgetActions
            budgetId={budget.id}
            status={budget.status ?? "draft"}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-panel p-4">
          <p className="text-xs text-muted-foreground">Доходы</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600">
            {Number(budget.totalIncome).toFixed(2)} ₼
          </p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-xs text-muted-foreground">Расходы</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-red-600">
            {Number(budget.totalExpense).toFixed(2)} ₼
          </p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-xs text-muted-foreground">Баланс</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {balance >= 0 ? "+" : ""}{balance.toFixed(2)} ₼
          </p>
        </div>
      </div>

      <BudgetTable
        budgetId={budget.id}
        items={items}
        canEdit={canEdit}
        totalIncome={budget.totalIncome}
        totalExpense={budget.totalExpense}
        monthlyFeeIncome={monthlyFeeIncome}
      />
      <BudgetHistory history={history} />
    </div>
  );
}
