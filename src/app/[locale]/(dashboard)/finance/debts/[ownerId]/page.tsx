import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";

import {Badge} from "@/components/ui/badge";
import {TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {requireTenantPermission} from "@/core/auth/session";
import {Link} from "@/i18n/navigation";
import {PrimaryMetric} from "@/modules/finance/components/finance-metric";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {FinanceStatusBadge} from "@/modules/finance/components/finance-status-badge";
import {FinanceTable} from "@/modules/finance/components/finance-table";
import {formatAmount, formatDate} from "@/modules/finance/money-format";
import {getOwnerLedger} from "@/modules/finance/services/finance-analytics.service";
import {getOwnerById} from "@/modules/owner/owner.service";

export default async function DebtorAccountPage({
    params,
}: {
    params: Promise<{locale: string; ownerId: string}>;
}) {
    const {locale, ownerId} = await params;
    const {tenantId} = await requireTenantPermission("finance:read");
    const t = await getTranslations("finance");
    const tc = await getTranslations("common");
    const owner = await getOwnerById(tenantId, ownerId);
    if (!owner) notFound();

    const ledger = await getOwnerLedger(tenantId, ownerId);
    const outstanding = ledger.charges.reduce((sum, charge) => sum + charge.outstanding, 0);
    const paid = ledger.payments.filter((payment) => payment.status === "confirmed").reduce((sum, payment) => sum + payment.amount, 0);
    const unallocated = ledger.payments.reduce((sum, payment) => sum + payment.unallocated, 0);

    return (
        <>
            <FinancePageHeader title={owner.fullName} description={t("debtsPage.account")}>
                <Link href="/finance/payments" className="inline-flex h-9 items-center rounded-[4px] bg-[var(--action)] px-3 text-sm font-bold text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.24)]">
                    {t("payments.register")}
                </Link>
            </FinancePageHeader>

            <div className="grid gap-3 md:grid-cols-3">
                <PrimaryMetric label={t("analytics.outstanding")} value={formatAmount(outstanding)} hint={t("debtsPage.outstandingHint")} />
                <PrimaryMetric label={t("overview.kpi.paid")} value={formatAmount(paid)} hint={t("overview.kpi.paidHint")} />
                <PrimaryMetric label={t("payments.unallocated")} value={formatAmount(unallocated)} hint={t("overview.actions.unallocated")} />
            </div>

            <h2 className="font-heading text-sm font-bold">{t("chargesPage.title")}</h2>
            <FinanceTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("charges.dueDate")}</TableHead>
                        <TableHead>{t("payments.unit")}</TableHead>
                        <TableHead className="text-right">{tc("amount")}</TableHead>
                        <TableHead className="text-right">{t("payments.allocated")}</TableHead>
                        <TableHead className="text-right">{t("analytics.outstanding")}</TableHead>
                        <TableHead>{tc("status")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ledger.charges.map((charge) => (
                        <TableRow key={charge.id}>
                            <TableCell className="text-sm text-muted-foreground tabular-nums">{formatDate(charge.dueDate, locale)}</TableCell>
                            <TableCell className="text-sm">{charge.unitNumber ?? "—"}</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{formatAmount(charge.amount)}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{formatAmount(charge.paid)}</TableCell>
                            <TableCell className="text-right text-sm font-semibold tabular-nums">{charge.outstanding > 0 ? formatAmount(charge.outstanding) : "—"}</TableCell>
                            <TableCell><FinanceStatusBadge kind="charge" status={charge.status} /></TableCell>
                        </TableRow>
                    ))}
                    {ledger.charges.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">{t("charges.noCharges")}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </FinanceTable>

            <h2 className="font-heading text-sm font-bold">{t("paymentsPage.title")}</h2>
            <FinanceTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>{tc("date")}</TableHead>
                        <TableHead>{t("payments.unit")}</TableHead>
                        <TableHead className="text-right">{tc("amount")}</TableHead>
                        <TableHead className="text-right">{t("payments.allocated")}</TableHead>
                        <TableHead className="text-right">{t("payments.unallocated")}</TableHead>
                        <TableHead>{tc("status")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ledger.payments.map((payment) => (
                        <TableRow key={payment.id}>
                            <TableCell className="text-sm text-muted-foreground tabular-nums">{formatDate(payment.paymentDate, locale)}</TableCell>
                            <TableCell className="text-sm">{payment.unitNumber ?? "—"}</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{formatAmount(payment.amount)}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{formatAmount(payment.allocated)}</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{payment.unallocated > 0 ? formatAmount(payment.unallocated) : "—"}</TableCell>
                            <TableCell><FinanceStatusBadge kind="payment" status={payment.status} /></TableCell>
                        </TableRow>
                    ))}
                    {ledger.payments.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">{t("payments.noPayments")}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </FinanceTable>

            {ledger.adjustments.length > 0 && (
                <>
                    <h2 className="font-heading text-sm font-bold">{t("adjustments.title")}</h2>
                    <section className="surface-panel overflow-hidden">
                        <ul>
                            {ledger.adjustments.map((adjustment) => (
                                <li key={adjustment.id} className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5 text-sm last:border-0">
                                    <div className="min-w-0">
                                        <p className="font-medium">{adjustment.reason}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(adjustment.createdAt.slice(0, 10), locale)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={adjustment.kind === "credit" ? "secondary" : "outline"}>{t(`adjustments.kinds.${adjustment.kind}`)}</Badge>
                                        <span className="amount font-semibold tabular-nums">{adjustment.kind === "credit" ? "−" : "+"}{formatAmount(adjustment.amount)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                </>
            )}
        </>
    );
}
