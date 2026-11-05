"use client";

import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {useState} from "react";

import {DateRangePicker, formatIsoDate} from "@/components/date-range-picker";
import {FilterReset, FilterSearch, FilterSelect, SortableHead, TableFilters, matchesQuery, sortRows, useTableQuery, type SortDirection} from "@/components/table-filters";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Table, TableBody, TableCell, TableHeader, TableRow} from "@/components/ui/table";
import {ChargeGenerateDialog} from "@/modules/finance/components/ChargeGenerateForm";
import {FinanceStatusBadge} from "@/modules/finance/components/finance-status-badge";
import {formatAmount} from "@/modules/finance/money-format";
import type {ChargeView} from "@/modules/finance/services/finance-analytics.service";

const STATUSES = ["pending", "partially_paid", "paid", "overdue", "cancelled"] as const;

export function ChargesTable({rows, canWrite}: {
    rows: ChargeView[];
    canWrite: boolean;
}) {
    const t = useTranslations("finance");
    const tc = useTranslations("common");
    const router = useRouter();
    const params = useTableQuery("charges");
    const [selected, setSelected] = useState<ChargeView | null>(null);
    const [generateOpen, setGenerateOpen] = useState(false);

    const query = params.value("q");
    const status = params.value("status");
    const from = params.value("from");
    const to = params.value("to");
    const sortKey = params.value("sort");
    const sortDir: SortDirection = params.value("dir") === "desc" ? "desc" : "asc";

    const filtered = rows.filter((row) =>
        (!status || row.status === status) &&
        (!from || row.dueDate >= from) &&
        (!to || row.dueDate <= to) &&
        matchesQuery(query, [row.ownerName, row.unitNumber])
    );
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
    const hasFilters = Boolean(query || status || from || to);
    const sort = {key: sortKey, direction: sortDir};

    function toggle(key: string) {
        if (sortKey !== key) params.update({sort: key, dir: "asc"});
        else if (sortDir === "asc") params.update({dir: "desc"});
        else params.update({sort: "", dir: ""});
    }

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <TableFilters>
                    <FilterSearch value={query} onChange={(value) => params.update({q: value})} placeholder={t("filters.searchCharges")} clearLabel={t("filters.clear")} />
                    <FilterSelect
                        label={t("filters.status")}
                        value={status}
                        onChange={(value) => params.update({status: value})}
                        options={[{value: "", label: t("filters.allStatuses")}, ...STATUSES.map((item) => ({value: item, label: t(`charges.status.${item}`)}))]}
                    />
                    <DateRangePicker
                        value={{from: from ? new Date(`${from}T00:00:00`) : undefined, to: to ? new Date(`${to}T00:00:00`) : undefined}}
                        onChange={(range) => params.update({from: formatIsoDate(range.from), to: formatIsoDate(range.to)})}
                        placeholder={t("dateRange.placeholder")}
                        presets={[]}
                    />
                    <FilterReset active={hasFilters} onReset={() => params.update({q: "", status: "", from: "", to: ""})} label={t("filters.reset")} />
                </TableFilters>
                <div className="ml-auto flex flex-wrap items-center gap-3">
                    <p className="text-sm text-muted-foreground">{sorted.length} / {rows.length} {tc("pieces")}</p>
                    {canWrite && <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}>+ {t("charges.generate")}</Button>}
                </div>
            </div>

            <div className="surface-panel overflow-hidden">
                <Table>
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
                                <TableCell className="text-sm text-muted-foreground">{row.dueDate}</TableCell>
                                <TableCell className="text-sm">{row.periodMonth}.{row.periodYear}</TableCell>
                                <TableCell className="text-sm">{row.unitNumber ?? "—"}</TableCell>
                                <TableCell className="text-sm">{row.ownerName ?? "—"}</TableCell>
                                <TableCell className="text-right text-sm font-medium">{formatAmount(row.amount)}</TableCell>
                                <TableCell className="text-right text-sm text-success">{formatAmount(row.paid)}</TableCell>
                                <TableCell className="text-right text-sm font-semibold">{row.outstanding > 0 ? formatAmount(row.outstanding) : "—"}</TableCell>
                                <TableCell><FinanceStatusBadge kind="charge" status={row.status} /></TableCell>
                            </TableRow>
                        ))}
                        {sorted.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground/70">
                                    {rows.length === 0 ? t("charges.noCharges") : t("filters.notFound")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

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
                            <Detail label={t("charges.dueDate")} value={selected.dueDate} />
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
