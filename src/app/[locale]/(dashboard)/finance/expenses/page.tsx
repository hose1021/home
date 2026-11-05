import {getTranslations} from "next-intl/server";

import {getPermissionsForRoles} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {ExpensesBoard} from "@/modules/finance/components/expenses-board";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {MetricCard} from "@/modules/finance/components/metric-card";
import {formatAmount} from "@/modules/finance/money-format";
import {getBuildingBudget, listExpenses} from "@/modules/finance/services/expense.service";

export default async function ExpensesPage() {
    const {session, tenantId} = await requireTenantPermission("finance:read");
    const permissions = getPermissionsForRoles(session.user.roles);
    const t = await getTranslations("finance");
    const [rows, budget] = await Promise.all([listExpenses(tenantId), getBuildingBudget(tenantId)]);

    return (
        <>
            <FinancePageHeader
                eyebrow={t("title")}
                title={t("expensesPage.title")}
                description={t("expensesPage.description")}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard label={t("expensesPage.income")} value={formatAmount(budget.income)} tone="success" hint={t("expensesPage.incomeHint")} />
                <MetricCard label={t("expensesPage.spent")} value={formatAmount(budget.expenses)} hint={t("expensesPage.spentHint")} />
                <MetricCard label={t("expensesPage.balance")} value={formatAmount(budget.balance)} tone={budget.balance >= 0 ? "success" : "danger"} />
            </div>

            <ExpensesBoard rows={rows} canWrite={permissions.includes("budget:write")} />
        </>
    );
}
