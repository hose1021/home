import {getTranslations} from "next-intl/server";

import {getPermissionsForRoles} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {ExpensesBoard} from "@/modules/finance/components/expenses-board";
import {PrimaryMetric} from "@/modules/finance/components/finance-metric";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {formatAmount} from "@/modules/finance/money-format";
import {resolvePeriod} from "@/modules/finance/period";
import {getBuildingBudget, listExpenses} from "@/modules/finance/services/expense.service";

export default async function ExpensesPage({searchParams}: {
    searchParams: Promise<{month?: string; from?: string; to?: string}>;
}) {
    const sp = await searchParams;
    const period = resolvePeriod({month: sp.month, from: sp.from, to: sp.to});
    const {session, tenantId} = await requireTenantPermission("finance:read");
    const permissions = getPermissionsForRoles(session.user.roles);
    const t = await getTranslations("finance");
    const [rows, budget] = await Promise.all([
        listExpenses(tenantId, 200, {from: period.from, to: period.to}),
        getBuildingBudget(tenantId),
    ]);
    // Budget balance and income are cumulative; only the spend figure follows the period.
    const spent = rows.reduce((sum, row) => sum + Number(row.amount), 0);

    return (
        <>
            <FinancePageHeader
                title={t("expensesPage.title")}
                description={t("expensesPage.description")}
            />

            <div className="grid gap-3 md:grid-cols-3">
                <PrimaryMetric label={t("expensesPage.balance")} value={formatAmount(budget.balance)} tone={budget.balance >= 0 ? "success" : "danger"} hint={t("expensesPage.balanceHint")} />
                <PrimaryMetric label={t("expensesPage.income")} value={formatAmount(budget.income)} hint={t("expensesPage.incomeHint")} />
                <PrimaryMetric label={t("expensesPage.spent")} value={formatAmount(spent)} hint={t("expensesPage.spentHint")} />
            </div>

            <ExpensesBoard rows={rows} canWrite={permissions.includes("budget:write")} />
        </>
    );
}
