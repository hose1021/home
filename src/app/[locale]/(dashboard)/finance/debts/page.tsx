import {getTranslations} from "next-intl/server";

import {requireTenantPermission} from "@/core/auth/session";
import {DebtorsTable} from "@/modules/finance/components/debtors-table";
import {MetricStrip, PrimaryMetric} from "@/modules/finance/components/finance-metric";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {formatAmount} from "@/modules/finance/money-format";
import {resolvePeriod} from "@/modules/finance/period";
import {getFinanceAnalytics, listDebtors} from "@/modules/finance/services/finance-analytics.service";

export default async function DebtsPage({searchParams}: {
    searchParams: Promise<{month?: string; from?: string; to?: string}>;
}) {
    const sp = await searchParams;
    const period = resolvePeriod({month: sp.month, from: sp.from, to: sp.to});
    // A debt balance is a snapshot: it reflects charges due on or before the period end.
    const asOf = period.to ? new Date(`${period.to}T23:59:59`) : new Date();
    const {tenantId} = await requireTenantPermission("finance:read");
    const t = await getTranslations("finance");
    const [analytics, debtors] = await Promise.all([
        getFinanceAnalytics(tenantId, asOf),
        listDebtors(tenantId, asOf),
    ]);
    const overdue = analytics.ageing.days1to30 + analytics.ageing.days31to60 + analytics.ageing.days61to90 + analytics.ageing.over90;

    return (
        <>
            <FinancePageHeader
                title={t("debtsPage.title")}
                description={t("debtsPage.description")}
            />

            <div className="grid gap-3 md:grid-cols-3">
                <PrimaryMetric label={t("analytics.outstanding")} value={formatAmount(analytics.outstanding)} hint={t("debtsPage.outstandingHint")} />
                <PrimaryMetric label={t("overview.kpi.overdue")} value={formatAmount(overdue)} tone={overdue > 0 ? "warning" : "default"} hint={t("overview.kpi.overdueHint")} />
                <PrimaryMetric label={t("analytics.over90")} value={formatAmount(analytics.ageing.over90)} tone={analytics.ageing.over90 > 0 ? "danger" : "default"} hint={t("debtsPage.over90Hint")} />
            </div>

            <MetricStrip
                items={[
                    {label: t("tabs.debtors"), value: String(analytics.debtorsCount)},
                    {label: t("analytics.charged"), value: formatAmount(analytics.charged)},
                    {label: t("analytics.paid"), value: formatAmount(analytics.paid)},
                ]}
            />

            <DebtorsTable rows={debtors} />
        </>
    );
}
