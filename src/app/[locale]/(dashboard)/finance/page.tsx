import {IconAlertTriangle, IconArrowRight, IconCalendarEvent, IconCash, IconPlus, IconReceipt, IconWallet} from "@tabler/icons-react";
import {getTranslations} from "next-intl/server";
import type {ReactNode} from "react";

import {Badge} from "@/components/ui/badge";
import {requireTenantPermission} from "@/core/auth/session";
import {Link} from "@/i18n/navigation";
import {BarChart} from "@/modules/finance/components/bar-chart";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {FinancePeriodPicker} from "@/modules/finance/components/finance-period-picker";
import {FinanceStatusBadge} from "@/modules/finance/components/finance-status-badge";
import {MetricCard} from "@/modules/finance/components/metric-card";
import {formatAmount} from "@/modules/finance/money-format";
import {getOverviewData} from "@/modules/finance/services/finance-analytics.service";
import {getTenantById} from "@/modules/tenant/tenant.service";

export default async function FinanceOverviewPage({
    params,
    searchParams,
}: {
    params: Promise<{locale: string}>;
    searchParams: Promise<{from?: string; to?: string}>;
}) {
    const {locale} = await params;
    const sp = await searchParams;
    const from = sp.from ?? "";
    const to = sp.to ?? "";
    const {tenantId} = await requireTenantPermission("finance:read");
    const t = await getTranslations("finance");
    const tenant = await getTenantById(tenantId);

    const data = await getOverviewData(tenantId, from, to);

    const monthLabel = (key: string) =>
        new Date(`${key}-01T00:00:00`).toLocaleDateString(locale, {month: "short"});
    const updated = new Date().toLocaleTimeString(locale, {hour: "2-digit", minute: "2-digit"});
    const ageingData = [
        {label: t("analytics.notDue"), value: data.ageing.notDue},
        {label: t("analytics.days1to30"), value: data.ageing.days1to30},
        {label: t("analytics.days31to60"), value: data.ageing.days31to60},
        {label: t("analytics.days61to90"), value: data.ageing.days61to90},
        {label: t("analytics.over90"), value: data.ageing.over90},
    ];

    return (
        <>
            <FinancePageHeader
                eyebrow={t("title")}
                title={t("overview.title")}
                description={t("overview.description")}
            >
                <FinancePeriodPicker from={from} to={to} />
                <Link href="/finance/charges" className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[var(--action)] px-4 text-sm font-bold text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.24)] transition-shadow hover:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.36)]">
                    <IconPlus className="size-4" /> {t("overview.chargeAction")}
                </Link>
                <Link href="/finance/payments" className="btn-soft inline-flex h-10 items-center gap-2 px-4 text-sm font-bold">
                    <IconCash className="size-4" /> {t("overview.paymentAction")}
                </Link>
                <Link href="/finance/expenses" className="btn-soft inline-flex h-10 items-center gap-2 px-4 text-sm font-bold">
                    <IconWallet className="size-4" /> {t("overview.expenseAction")}
                </Link>
            </FinancePageHeader>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{tenant?.name ?? "MMMC"}</Badge>
                <span>{t("overview.updated")}: {updated}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <MetricCard label={t("overview.kpi.charged")} value={formatAmount(data.kpi.charged)} hint={t("overview.kpi.chargedHint")} title={t("overview.kpi.chargedHint")} />
                <MetricCard label={t("overview.kpi.paid")} value={formatAmount(data.kpi.paid)} hint={t("overview.kpi.paidHint")} tone="success" title={t("overview.kpi.paidHint")} />
                <MetricCard label={t("overview.kpi.outstanding")} value={formatAmount(data.kpi.outstanding)} hint={t("overview.kpi.outstandingHint")} tone="warning" title={t("overview.kpi.outstandingHint")} />
                <MetricCard label={t("overview.kpi.overdue")} value={formatAmount(data.kpi.overdue)} hint={t("overview.kpi.overdueHint")} tone="danger" title={t("overview.kpi.overdueHint")} />
                <MetricCard label={t("overview.kpi.cash")} value={formatAmount(data.kpi.cash)} hint={t("overview.kpi.cashHint")} title={t("overview.kpi.cashHint")} />
                <MetricCard label={t("overview.kpi.collection")} value={`${data.kpi.collectionRate}%`} hint={t("overview.kpi.collectionHint")} title={t("overview.kpi.collectionHint")} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <section className="surface-panel p-5">
                    <h2 className="font-heading text-sm font-bold">{t("overview.charts.monthly")}</h2>
                    <div className="mt-4">
                        <BarChart
                            ariaLabel={t("overview.charts.monthly")}
                            data={data.monthly.map((month) => ({label: monthLabel(month.month)}))}
                            series={[
                                {label: t("overview.kpi.charged"), color: "bg-primary", values: data.monthly.map((month) => month.charged)},
                                {label: t("overview.kpi.paid"), color: "bg-success", values: data.monthly.map((month) => month.paid)},
                            ]}
                            format={formatAmount}
                        />
                    </div>
                </section>

                <section className="surface-panel p-5">
                    <h2 className="font-heading text-sm font-bold">{t("overview.charts.cashflow")}</h2>
                    <div className="mt-4">
                        <BarChart
                            ariaLabel={t("overview.charts.cashflow")}
                            data={data.cashflow.map((month) => ({label: monthLabel(month.month)}))}
                            series={[
                                {label: t("overview.inflow"), color: "bg-success", values: data.cashflow.map((month) => month.inflow)},
                                {label: t("overview.outflow"), color: "bg-danger", values: data.cashflow.map((month) => month.outflow)},
                            ]}
                            format={formatAmount}
                        />
                    </div>
                </section>

                <section className="surface-panel p-5">
                    <h2 className="font-heading text-sm font-bold">{t("overview.charts.ageing")}</h2>
                    <div className="mt-4">
                        <BarChart
                            ariaLabel={t("overview.charts.ageing")}
                            data={ageingData}
                            series={[{label: t("analytics.outstanding"), color: "bg-warning", values: ageingData.map((bucket) => bucket.value)}]}
                            format={formatAmount}
                        />
                    </div>
                </section>

            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <section className="surface-panel overflow-hidden">
                    <div className="border-b border-border px-5 py-4">
                        <h2 className="font-heading text-sm font-bold">{t("overview.actions.title")}</h2>
                    </div>
                    <ul>
                        <ActionRow
                            icon={<IconAlertTriangle className="size-4" />}
                            title={t("overview.actions.overdue")}
                            detail={`${data.actions.overdueDebtors} · ${formatAmount(data.actions.overdueAmount)}`}
                            href="/finance/debts"
                            linkLabel={t("overview.open")}
                        />
                        <ActionRow
                            icon={<IconCash className="size-4" />}
                            title={t("overview.actions.unallocated")}
                            detail={formatAmount(data.actions.unallocated)}
                            href="/finance/payments"
                            linkLabel={t("overview.open")}
                        />
                        <ActionRow
                            icon={<IconCalendarEvent className="size-4" />}
                            title={t("overview.actions.upcoming")}
                            detail={`${data.actions.upcomingCount} · ${formatAmount(data.actions.upcomingAmount)}`}
                            href="/finance/charges"
                            linkLabel={t("overview.open")}
                        />
                    </ul>
                </section>

                <section className="surface-panel overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border px-5 py-4">
                        <h2 className="font-heading text-sm font-bold">{t("overview.activity.title")}</h2>
                        <Link href="/finance/payments" className="text-xs font-bold text-primary hover:text-brand-soft">
                            {t("overview.open")}
                        </Link>
                    </div>
                    {data.activity.length === 0 ? (
                        <p className="empty-slot m-5 text-xs">{t("overview.activity.empty")}</p>
                    ) : (
                        <ul>
                            {data.activity.map((row) => (
                                <li key={row.id} className="flex items-center gap-3 border-b border-border/70 px-5 py-3 text-sm last:border-0">
                                    <span className="chip size-8 shrink-0 text-muted-foreground">
                                        {row.kind === "payment" ? <IconCash className="size-4" /> : <IconReceipt className="size-4" />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{row.title}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{row.date}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="amount text-sm font-semibold">{formatAmount(row.amount)}</p>
                                        <div className="mt-1 flex justify-end">
                                            <FinanceStatusBadge kind={row.kind} status={row.status} />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </>
    );
}

function ActionRow({icon, title, detail, href, linkLabel}: {
    icon: ReactNode;
    title: string;
    detail: string;
    href: string;
    linkLabel: string;
}) {
    return (
        <li className="flex items-center gap-3 border-b border-border/70 px-5 py-3 text-sm last:border-0">
            <span className="chip size-8 shrink-0 text-muted-foreground">{icon}</span>
            <div className="min-w-0 flex-1">
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
            </div>
            <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:text-brand-soft">
                {linkLabel} <IconArrowRight className="size-3.5" />
            </Link>
        </li>
    );
}
