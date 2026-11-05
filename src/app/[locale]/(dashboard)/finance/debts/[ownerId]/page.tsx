import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";

import {Badge} from "@/components/ui/badge";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {requireTenantPermission} from "@/core/auth/session";
import {Link} from "@/i18n/navigation";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {FinanceStatusBadge} from "@/modules/finance/components/finance-status-badge";
import {MetricCard} from "@/modules/finance/components/metric-card";
import {formatAmount} from "@/modules/finance/money-format";
import {getOwnerLedger} from "@/modules/finance/services/finance-analytics.service";
import {getOwnerById} from "@/modules/owner/owner.service";

export default async function DebtorAccountPage({
    params,
}: {
    params: Promise<{locale: string; ownerId: string}>;
}) {
    const {ownerId} = await params;
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
            <FinancePageHeader
                eyebrow={t("title")}
                title={owner.fullName}
                description={t("debtsPage.account")}
            >
                <Link href={`/finance/payments`} className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[var(--action)] px-4 text-sm font-bold text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.24)]">
                    {t("payments.register")}
                </Link>
            </FinancePageHeader>

            <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label={t("analytics.outstanding")} value={formatAmount(outstanding)} tone="danger" />
                <MetricCard label={t("overview.kpi.paid")} value={formatAmount(paid)} tone="success" />
                <MetricCard label={t("payments.unallocated")} value={formatAmount(unallocated)} />
            </div>

            <section className="surface-panel overflow-hidden">
                <div className="border-b border-border px-5 py-4">
                    <h2 className="font-heading text-sm font-bold">{t("chargesPage.title")}</h2>
                </div>
                <Table>
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
                                <TableCell className="text-sm text-muted-foreground">{charge.dueDate}</TableCell>
                                <TableCell className="text-sm">{charge.unitNumber ?? "—"}</TableCell>
                                <TableCell className="text-right text-sm">{formatAmount(charge.amount)}</TableCell>
                                <TableCell className="text-right text-sm text-success">{formatAmount(charge.paid)}</TableCell>
                                <TableCell className="text-right text-sm font-semibold">{charge.outstanding > 0 ? formatAmount(charge.outstanding) : "—"}</TableCell>
                                <TableCell><FinanceStatusBadge kind="charge" status={charge.status} /></TableCell>
                            </TableRow>
                        ))}
                        {ledger.charges.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground/70">{t("charges.noCharges")}</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </section>

            <section className="surface-panel overflow-hidden">
                <div className="border-b border-border px-5 py-4">
                    <h2 className="font-heading text-sm font-bold">{t("paymentsPage.title")}</h2>
                </div>
                <Table>
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
                                <TableCell className="text-sm text-muted-foreground">{payment.paymentDate}</TableCell>
                                <TableCell className="text-sm">{payment.unitNumber ?? "—"}</TableCell>
                                <TableCell className="text-right text-sm">{formatAmount(payment.amount)}</TableCell>
                                <TableCell className="text-right text-sm text-success">{formatAmount(payment.allocated)}</TableCell>
                                <TableCell className="text-right text-sm">{payment.unallocated > 0 ? formatAmount(payment.unallocated) : "—"}</TableCell>
                                <TableCell><FinanceStatusBadge kind="payment" status={payment.status} /></TableCell>
                            </TableRow>
                        ))}
                        {ledger.payments.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground/70">{t("payments.noPayments")}</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </section>

            {ledger.adjustments.length > 0 && (
                <section className="surface-panel overflow-hidden">
                    <div className="border-b border-border px-5 py-4">
                        <h2 className="font-heading text-sm font-bold">{t("adjustments.title")}</h2>
                    </div>
                    <ul>
                        {ledger.adjustments.map((adjustment) => (
                            <li key={adjustment.id} className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 text-sm last:border-0">
                                <div className="min-w-0">
                                    <p className="font-medium">{adjustment.reason}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{adjustment.createdAt.slice(0, 10)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={adjustment.kind === "credit" ? "secondary" : "outline"}>{t(`adjustments.kinds.${adjustment.kind}`)}</Badge>
                                    <span className="amount font-semibold">{adjustment.kind === "credit" ? "−" : "+"}{formatAmount(adjustment.amount)}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
}
