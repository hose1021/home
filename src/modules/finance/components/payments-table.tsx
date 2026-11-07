"use client";

import {useRouter, useSearchParams} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import {useState} from "react";

import {FilterReset, FilterSearch, FilterSelect, SortableHead, TableFilters, sortRows, useTableQuery, type SortDirection} from "@/components/table-filters";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {TableBody, TableCell, TableHeader, TableRow} from "@/components/ui/table";
import {PAYMENT_METHODS, PAYMENT_STATUSES} from "@/core/db/schema/enums";
import {FinanceStatusBadge} from "@/modules/finance/components/finance-status-badge";
import {FinanceTable} from "@/modules/finance/components/finance-table";
import {PaymentDialog} from "@/modules/finance/components/PaymentForm";
import {formatAmount, formatDate} from "@/modules/finance/money-format";
import {resolvePeriod} from "@/modules/finance/period";
import type {PaymentView} from "@/modules/finance/services/finance-analytics.service";
import {filterPaymentViews} from "@/modules/finance/services/ledger-filters";

type UnitOption = {id: string; unitNumber: string; entrance: number; floor: number; ownerName: string | null; ownerId: string | null};

export function PaymentsTable({rows, units, canWrite}: {
    rows: PaymentView[];
    units: UnitOption[];
    canWrite: boolean;
}) {
    const t = useTranslations("finance");
    const tc = useTranslations("common");
    const locale = useLocale();
    const router = useRouter();
    const params = useTableQuery("payments");
    const searchParams = useSearchParams();
    const [selected, setSelected] = useState<PaymentView | null>(null);
    const [registerOpen, setRegisterOpen] = useState(false);

    const query = params.value("q");
    const status = params.value("status");
    const method = params.value("method");
    const period = resolvePeriod({month: searchParams.get("month"), from: searchParams.get("from"), to: searchParams.get("to")});
    const sortKey = params.value("sort");
    const sortDir: SortDirection = params.value("dir") === "desc" ? "desc" : "asc";

    const filtered = filterPaymentViews(rows, {query, status, method, period});
    const sorted = sortRows(filtered, sortKey, sortDir, {
        date: (row) => row.paymentDate,
        unit: (row) => row.unitNumber,
        owner: (row) => row.ownerName,
        period: (row) => row.periodYear * 100 + row.periodMonth,
        amount: (row) => row.amount,
        allocated: (row) => row.allocated,
        unallocated: (row) => row.unallocated,
        method: (row) => row.method,
        status: (row) => row.status,
    });
    const hasFilters = Boolean(query || status || method);
    const sort = {key: sortKey, direction: sortDir};
    const totals = sorted.reduce(
        (acc, row) => ({
            amount: acc.amount + Number(row.amount),
            allocated: acc.allocated + Number(row.allocated),
            unallocated: acc.unallocated + Number(row.unallocated),
        }),
        {amount: 0, allocated: 0, unallocated: 0},
    );

    function toggle(key: string) {
        if (sortKey !== key) params.update({sort: key, dir: "asc"});
        else if (sortDir === "asc") params.update({dir: "desc"});
        else params.update({sort: "", dir: ""});
    }

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                <TableFilters>
                    <FilterSearch value={query} onChange={(value) => params.update({q: value})} placeholder={t("filters.searchPayments")} clearLabel={t("filters.clear")} />
                    <FilterSelect
                        label={t("filters.method")}
                        value={method}
                        onChange={(value) => params.update({method: value})}
                        options={[{value: "", label: t("filters.allMethods")}, ...PAYMENT_METHODS.map((item) => ({value: item, label: t(`payments.paymentMethods.${item}`)}))]}
                    />
                    <FilterSelect
                        label={t("filters.status")}
                        value={status}
                        onChange={(value) => params.update({status: value})}
                        options={[{value: "", label: t("filters.allStatuses")}, ...PAYMENT_STATUSES.map((item) => ({value: item, label: t(`payments.status.${item}`)}))]}
                    />
                    <FilterReset active={hasFilters} onReset={() => params.update({q: "", status: "", method: ""})} label={t("filters.reset")} />
                </TableFilters>
                <p className="ml-auto text-xs text-muted-foreground tabular-nums">{sorted.length} / {rows.length} {tc("pieces")}</p>
                {canWrite && <Button size="sm" onClick={() => setRegisterOpen(true)}>+ {t("payments.register")}</Button>}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>{tc("amount")} <span className="amount font-semibold text-foreground">{formatAmount(totals.amount)}</span></span>
                <span>{t("payments.allocated")} <span className="amount font-semibold text-foreground">{formatAmount(totals.allocated)}</span></span>
                <span>{t("payments.unallocated")} <span className="amount font-semibold text-foreground">{formatAmount(totals.unallocated)}</span></span>
            </div>

            <FinanceTable>
                    <TableHeader>
                        <TableRow>
                            <SortableHead label={tc("date")} sortKey="date" sort={sort} onSort={toggle} />
                            <SortableHead label={t("payments.unit")} sortKey="unit" sort={sort} onSort={toggle} />
                            <SortableHead label={t("payments.owner")} sortKey="owner" sort={sort} onSort={toggle} />
                            <SortableHead label={tc("amount")} sortKey="amount" align="right" sort={sort} onSort={toggle} />
                            <SortableHead label={t("payments.allocated")} sortKey="allocated" align="right" sort={sort} onSort={toggle} />
                            <SortableHead label={t("payments.unallocated")} sortKey="unallocated" align="right" sort={sort} onSort={toggle} />
                            <SortableHead label={t("payments.method")} sortKey="method" sort={sort} onSort={toggle} />
                            <SortableHead label={tc("status")} sortKey="status" sort={sort} onSort={toggle} />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sorted.map((row) => (
                            <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row)}>
                                <TableCell className="text-sm text-muted-foreground tabular-nums">{formatDate(row.paymentDate, locale)}</TableCell>
                                <TableCell className="text-sm">{row.unitNumber ?? "—"}</TableCell>
                                <TableCell className="text-sm">{row.ownerName ?? "—"}</TableCell>
                                <TableCell className="text-right text-sm font-medium tabular-nums">{formatAmount(row.amount)}</TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{formatAmount(row.allocated)}</TableCell>
                                <TableCell className={row.unallocated > 0 ? "text-right text-sm text-warning tabular-nums" : "text-right text-sm text-muted-foreground tabular-nums"}>
                                    {row.unallocated > 0 ? formatAmount(row.unallocated) : "—"}
                                </TableCell>
                                <TableCell className="text-sm">{t(`payments.paymentMethods.${row.method}` as Parameters<typeof t>[0])}</TableCell>
                                <TableCell><FinanceStatusBadge kind="payment" status={row.status} /></TableCell>
                            </TableRow>
                        ))}
                        {sorted.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                                    {rows.length === 0 ? t("payments.noPayments") : t("filters.notFound")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
            </FinanceTable>

            <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("payments.details")}</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                            <Detail label={tc("date")} value={formatDate(selected.paymentDate, locale)} />
                            <Detail label={t("payments.owner")} value={selected.ownerName ?? "—"} />
                            <Detail label={t("payments.unit")} value={selected.unitNumber ?? "—"} />
                            <Detail label={tc("amount")} value={formatAmount(selected.amount)} />
                            <Detail label={t("payments.allocated")} value={formatAmount(selected.allocated)} />
                            <Detail label={t("payments.unallocated")} value={formatAmount(selected.unallocated)} />
                            <Detail label={t("payments.method")} value={t(`payments.paymentMethods.${selected.method}` as Parameters<typeof t>[0])} />
                            <Detail label={t("payments.referenceNo")} value={selected.referenceNo ?? "—"} />
                            <Detail label={tc("status")} value={<FinanceStatusBadge kind="payment" status={selected.status} />} />
                        </dl>
                    )}
                </DialogContent>
            </Dialog>

            <PaymentDialog
                units={units}
                open={registerOpen}
                onOpenChange={(open) => {
                    setRegisterOpen(open);
                    if (!open) router.refresh();
                }}
            />
        </>
    );
}

function Detail({label, value}: {label: string; value: React.ReactNode}) {
    return (
        <>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
        </>
    );
}
