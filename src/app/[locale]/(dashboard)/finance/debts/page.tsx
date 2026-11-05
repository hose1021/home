import {getTranslations} from "next-intl/server";

import {requireTenantPermission} from "@/core/auth/session";
import {DebtorsTable} from "@/modules/finance/components/debtors-table";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {MetricCard} from "@/modules/finance/components/metric-card";
import {formatAmount} from "@/modules/finance/money-format";
import {getFinanceAnalytics, listDebtors} from "@/modules/finance/services/finance-analytics.service";

export default async function DebtsPage() {
    const {tenantId} = await requireTenantPermission("finance:read");
    const t = await getTranslations("finance");
    const [analytics, debtors] = await Promise.all([
        getFinanceAnalytics(tenantId),
        listDebtors(tenantId),
    ]);
    const overdue = analytics.ageing.days1to30 + analytics.ageing.days31to60 + analytics.ageing.days61to90 + analytics.ageing.over90;

    return (
        <>
            <FinancePageHeader
                eyebrow={t("title")}
                title={t("debtsPage.title")}
                description={t("debtsPage.description")}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label={t("analytics.outstanding")} value={formatAmount(analytics.outstanding)} tone="warning" />
                <MetricCard label={t("overview.kpi.overdue")} value={formatAmount(overdue)} tone="danger" />
                <MetricCard label={t("tabs.debtors")} value={String(analytics.debtorsCount)} />
                <MetricCard label={t("analytics.over90")} value={formatAmount(analytics.ageing.over90)} tone="danger" />
            </div>

            <DebtorsTable rows={debtors} />
        </>
    );
}
