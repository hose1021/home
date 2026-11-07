"use client";

import {useRouter, useSearchParams} from "next/navigation";
import {useTranslations, useLocale} from "next-intl";
import {useState} from "react";

import {FilterReset, FilterSearch, FilterSelect, SortableHead, TableFilters, matchesQuery, sortRows, useTableQuery, type SortDirection} from "@/components/table-filters";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {TableBody, TableCell, TableHeader, TableRow} from "@/components/ui/table";
import {CHARGE_STATUSES} from "@/core/db/schema/enums";
import {ChargeGenerateDialog} from "@/modules/finance/components/ChargeGenerateForm";
import {FinanceStatusBadge} from "@/modules/finance/components/finance-status-badge";
import {FinanceTable} from "@/modules/finance/components/finance-table";
import {formatAmount, formatDate} from "@/modules/finance/money-format";
import {isWholeMonth, resolvePeriod} from "@/modules/finance/period";
import type {ChargeView} from "@/modules/finance/services/finance-analytics.service";

export function ChargesTable({rows, canWrite}: {
    rows: ChargeView[];
    canWrite: boolean;
}) {
    const t = useTranslations("finance");
    const tc = useTranslations("common");
    const locale = useLocale();
    const router = useRouter();
    const params = useTableQuery("charges");
    const searchParams = useSearchParams();
    const [selected, setSelected] = useState<ChargeView | null>(null);
    const [generateOpen, setGenerateOpen] = useState(false);

    const query = params.value("q");
    const status = params.value("status");
    const period = resolvePeriod({month: searchParams.get("month"), from: searchParams.get("from"), to: searchParams.get("to")});
    const byBillingMonth = isWholeMonth(period.from, period.to);
    const billingMonth = period.from.slice(0, 7);
    const sortKey = params.value("sort");
    const sortDir: SortDirection = params.value("dir") === "desc" ? "desc" : "asc";

    const filtered = rows.filter((row) => {
        const inPeriod = byBillingMonth
            ? `${row.periodYear}-${String(row.periodMonth).padStart(2, "0")}` === billingMonth
            : (!period.from || row.dueDate >= period.from) && (!period.to || row.dueDate <= period.to);
        return inPeriod &&
            (!status || row.status === status) &&
            matchesQuery(query, [row.ownerName, row.unitNumber]);
    });
    const sorted = sortRows(filtered, sortKey, sortDir, {
        due: (row) => row.dueDate,
        period: (row) => row.periodYear * 100 + row.periodMonth,
        unit: (row) => row.unitNumber,
        owner: (row) => row.ownerName,
        amount: (row) => row.amount,
        paid: (row) => row.paid,
        outstanding: (row) => row.outstanding,
        status: (row) => row.status,
    });
    const hasFilters = Boolean(query || status);
    const sort = {key: sortKey, direction: sortDir};
    const totals = sorted.reduce(
        (acc, row) => ({
            amount: acc.amount + Number(row.amount),
            paid: acc.paid + Number(row.paid),
            outstanding: acc.outstanding + Number(row.outstanding),
        }),
        {amount: 0, paid: 0, outstanding: 0},
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
                    <FilterSearch value={query} onChange={(value) => params.update({q: value})} placeholder={t("filters.searchCharges")} clearLabel={t("filters.clear")} />
                    <FilterSelect
                        label={t("filters.status")}
                        value={status}
                        onChange={(value) => params.update({status: value})}
                        options={[{value: "", label: t("filters.allStatuses")}, ...CHARGE_STATUSES.map((item) => ({value: item, label: t(`charges.status.${item}`)}))]}
                    />
                    <FilterReset active={hasFilters} onReset={() => params.update({q: "", status: ""})} label={t("filters.reset")} />
                </TableFilters>
                <p className="ml-auto text-xs text-muted-foreground tabular-nums">{sorted.length} / {rows.length} {tc("pieces")}</p>
                {canWrite && <Button size="sm" onClick={() => setGenerateOpen(true)}>+ {t("charges.generate")}</Button>}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>{t("analytics.charged")} <span className="amount font-semibold text-foreground">{formatAmount(totals.amount)}</span></span>
                <span>{t("analytics.paid")} <span className="amount font-semibold text-foreground">{formatAmount(totals.paid)}</span></span>
                <span>{t("debtors.outstanding")} <span className="amount font-semibold text-foreground">{formatAmount(totals.outstanding)}</span></span>
            </div>

            <FinanceTable>
                    <TableHeader>
                        <TableRow>
                            <SortableHead label={t("charges.dueDate")} sortKey="due" sort={sort} onSort={toggle} />
                            <SortableHead label={tc("period")} sortKey="period" sort={sort} onSort={toggle} />
                            <SortableHead label={t("payments.unit")} sortKey="unit" sort={sort} onSort={toggle} />
                            <SortableHead label={t("payments.owner")} sortKey="owner" sort={sort} onSort={toggle} />
                            <SortableHead label={tc("amount")} sortKey="amount" align="right" sort={sort} onSort={toggle} />
                            <SortableHead label={t("payments.allocated")} sortKey="paid" align="right" sort={sort} onSort={toggle} />
                            <SortableHead label={t("debtors.outstanding")} sortKey="outstanding" align="right" sort={sort} onSort={toggle} />
                            <SortableHead label={tc("status")} sortKey="status" sort={sort} onSort={toggle} />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sorted.map((row) => (
                            <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row)}>
                                <TableCell className="text-sm text-muted-foreground tabular-nums">{formatDate(row.dueDate, locale)}</TableCell>
                                <TableCell className="text-sm tabular-nums">{String(row.periodMonth).padStart(2, "0")}.{row.periodYear}</TableCell>
                                <TableCell className="text-sm">{row.unitNumber ?? "—"}</TableCell>
                                <TableCell className="text-sm">{row.ownerName ?? "—"}</TableCell>
                                <TableCell className="text-right text-sm font-medium">{formatAmount(row.amount)}</TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{formatAmount(row.paid)}</TableCell>
                                <TableCell className="text-right text-sm font-semibold tabular-nums">{row.outstanding > 0 ? formatAmount(row.outstanding) : "—"}</TableCell>
                                <TableCell><FinanceStatusBadge kind="charge" status={row.status} /></TableCell>
                            </TableRow>
                        ))}
                        {sorted.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                                    {rows.length === 0 ? t("charges.noCharges") : t("filters.notFound")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
            </FinanceTable>

            <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("charges.details")}</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                            <Detail label={t("payments.owner")} value={selected.ownerName ?? "—"} />
                            <Detail label={t("payments.unit")} value={selected.unitNumber ?? "—"} />
                            <Detail label={tc("period")} value={`${selected.periodMonth}.${selected.periodYear}`} />
                            <Detail label={t("charges.dueDate")} value={formatDate(selected.dueDate, locale)} />
                            <Detail label={tc("amount")} value={formatAmount(selected.amount)} />
                            <Detail label={t("payments.allocated")} value={formatAmount(selected.paid)} />
                            <Detail label={t("debtors.outstanding")} value={formatAmount(selected.outstanding)} />
                            <Detail label={tc("status")} value={<FinanceStatusBadge kind="charge" status={selected.status} />} />
                        </dl>
                    )}
                </DialogContent>
            </Dialog>

            <ChargeGenerateDialog
                open={generateOpen}
                onOpenChange={(open) => {
                    setGenerateOpen(open);
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
