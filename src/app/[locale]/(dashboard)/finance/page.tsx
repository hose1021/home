import {IconAlertTriangle, IconArrowRight, IconCash, IconClock, IconReceipt} from "@tabler/icons-react";
import {getTranslations} from "next-intl/server";

import {requireTenantPermission} from "@/core/auth/session";
import {Link} from "@/i18n/navigation";
import {DualBarChart, RankedBarChart} from "@/modules/finance/components/finance-charts";
import {FinancePanel, MetricStrip, PrimaryMetric} from "@/modules/finance/components/finance-metric";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {FinanceStatusBadge} from "@/modules/finance/components/finance-status-badge";
import {formatAmount, formatDate} from "@/modules/finance/money-format";
import {resolvePeriod} from "@/modules/finance/period";
import {getOverviewData} from "@/modules/finance/services/finance-analytics.service";
import {getTenantById} from "@/modules/tenant/tenant.service";

export default async function FinanceOverviewPage({
    params,
    searchParams,
}: {
    params: Promise<{locale: string}>;
    searchParams: Promise<{from?: string; to?: string; month?: string}>;
}) {
    const {locale} = await params;
    const sp = await searchParams;
    const period = resolvePeriod({month: sp.month, from: sp.from, to: sp.to});
    const {tenantId} = await requireTenantPermission("finance:read");
    const t = await getTranslations("finance");
    const tenant = await getTenantById(tenantId);

    const data = await getOverviewData(tenantId, period.from, period.to);

    const monthLabel = (key: string) =>
        new Date(`${key}-01T00:00:00`).toLocaleDateString(locale, {month: "short"});
    const monthly = data.monthly.map((month) => ({label: monthLabel(month.month), charged: month.charged, paid: month.paid}));
    const cashflow = data.cashflow.map((month) => ({label: monthLabel(month.month), inflow: month.inflow, outflow: month.outflow}));
    const ageing = [
        {label: t("analytics.notDue"), value: data.ageing.notDue},
        {label: t("analytics.days1to30"), value: data.ageing.days1to30},
        {label: t("analytics.days31to60"), value: data.ageing.days31to60},
        {label: t("analytics.days61to90"), value: data.ageing.days61to90},
        {label: t("analytics.over90"), value: data.ageing.over90},
    ];
    const hasAttention = data.actions.overdueAmount > 0 || data.actions.unallocated > 0 || data.actions.upcomingCount > 0;
    const updated = new Date().toLocaleTimeString(locale, {hour: "2-digit", minute: "2-digit"});

    return (
        <>
            <FinancePageHeader title={t("overview.title")} description={t("overview.description")}>
                <span className="text-xs text-muted-foreground">
                    {tenant?.name ?? "MMMC"} · {t("overview.updated")} {updated}
                </span>
            </FinancePageHeader>

            <div className="grid gap-3 md:grid-cols-3">
                <PrimaryMetric label={t("overview.kpi.outstanding")} value={formatAmount(data.kpi.outstanding)} hint={t("overview.kpi.outstandingHint")} />
                <PrimaryMetric label={t("overview.kpi.paid")} value={formatAmount(data.kpi.paid)} hint={t("overview.kpi.paidHint")} />
                <PrimaryMetric label={t("overview.kpi.cash")} value={formatAmount(data.kpi.cash)} hint={t("overview.kpi.cashHint")} />
            </div>

            <MetricStrip
                items={[
                    {label: t("overview.kpi.charged"), value: formatAmount(data.kpi.charged)},
                    {label: t("overview.kpi.overdue"), value: formatAmount(data.kpi.overdue), tone: data.kpi.overdue > 0 ? "warning" : "default"},
                    {label: t("overview.kpi.collection"), value: `${data.kpi.collectionRate}%`},
                ]}
            />

            <div className="grid gap-4 xl:grid-cols-3">
                <FinancePanel className="xl:col-span-2" title={t("overview.charts.monthly")} hint={t("overview.charts.monthlyHint")}>
                    <DualBarChart
                        ariaLabel={t("overview.charts.monthly")}
                        data={monthly}
                        series={[
                            {key: "charged", label: t("analytics.charged"), color: "var(--chart-1)"},
                            {key: "paid", label: t("analytics.paid"), color: "var(--chart-3)"},
                        ]}
                    />
                </FinancePanel>

                <FinancePanel title={t("overview.actions.title")} hint={t("overview.actions.hint")}>
                    {hasAttention ? (
                        <ul className="flex flex-col">
                            {data.actions.overdueAmount > 0 && (
                                <AttentionRow
                                    icon={<IconAlertTriangle className="size-4" />}
                                    label={t("overview.actions.overdue")}
                                    detail={`${data.actions.overdueDebtors} · ${formatAmount(data.actions.overdueAmount)}`}
                                    href="/finance/debts"
                                    openLabel={t("overview.open")}
                                    tone="danger"
                                />
                            )}
                            {data.actions.unallocated > 0 && (
                                <AttentionRow
                                    icon={<IconCash className="size-4" />}
                                    label={t("overview.actions.unallocated")}
                                    detail={formatAmount(data.actions.unallocated)}
                                    href="/finance/payments"
                                    openLabel={t("overview.open")}
                                />
                            )}
                            {data.actions.upcomingCount > 0 && (
                                <AttentionRow
                                    icon={<IconClock className="size-4" />}
                                    label={t("overview.actions.upcoming")}
                                    detail={`${data.actions.upcomingCount} · ${formatAmount(data.actions.upcomingAmount)}`}
                                    href="/finance/charges"
                                    openLabel={t("overview.open")}
                                />
                            )}
                        </ul>
                    ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">{t("overview.actions.empty")}</p>
                    )}
                </FinancePanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <FinancePanel title={t("overview.charts.cashflow")} hint={t("overview.charts.cashflowHint")}>
                    <DualBarChart
                        ariaLabel={t("overview.charts.cashflow")}
                        height={200}
                        data={cashflow}
                        series={[
                            {key: "inflow", label: t("overview.inflow"), color: "var(--chart-3)"},
                            {key: "outflow", label: t("overview.outflow"), color: "var(--chart-4)"},
                        ]}
                    />
                </FinancePanel>

                <FinancePanel title={t("overview.charts.ageing")} hint={t("overview.charts.ageingHint")}>
                    <RankedBarChart ariaLabel={t("overview.charts.ageing")} data={ageing} color="var(--chart-4)" height={200} />
                </FinancePanel>
            </div>

            <FinancePanel
                title={t("overview.activity.title")}
                action={
                    <Link href="/finance/payments" className="text-xs font-bold text-primary hover:text-brand-soft">
                        {t("overview.open")}
                    </Link>
                }
            >
                {data.activity.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("overview.activity.empty")}</p>
                ) : (
                    <ul className="-mx-4 -mb-4">
                        {data.activity.map((row) => (
                            <li key={row.id} className="flex items-center gap-3 border-t border-border/70 px-4 py-2.5 text-sm first:border-t-0">
                                <span className="chip size-7 shrink-0 text-muted-foreground">
                                    {row.kind === "payment" ? <IconCash className="size-3.5" /> : <IconReceipt className="size-3.5" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{row.title}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(row.date, locale)}</p>
                                </div>
                                <FinanceStatusBadge kind={row.kind} status={row.status} />
                                <p className="amount w-28 shrink-0 text-right text-sm font-semibold tabular-nums">{formatAmount(row.amount)}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </FinancePanel>
        </>
    );
}

function AttentionRow({icon, label, detail, href, openLabel, tone = "default"}: {
    icon: React.ReactNode;
    label: string;
    detail: string;
    href: string;
    openLabel: string;
    tone?: "default" | "danger";
}) {
    return (
        <li className="flex items-center gap-3 border-t border-border/70 py-3 first:border-t-0 first:pt-0">
            <span className={tone === "danger" ? "chip size-7 shrink-0 text-danger" : "chip size-7 shrink-0 text-muted-foreground"}>{icon}</span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{label}</p>
                <p className="amount mt-0.5 text-xs tabular-nums text-muted-foreground">{detail}</p>
            </div>
            <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:text-brand-soft">
                {openLabel} <IconArrowRight className="size-3.5" />
            </Link>
        </li>
    );
}
