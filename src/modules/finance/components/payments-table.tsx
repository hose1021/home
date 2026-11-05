"use client";

import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {useState} from "react";

import {DateRangePicker, formatIsoDate} from "@/components/date-range-picker";
import {FilterReset, FilterSearch, FilterSelect, SortableHead, TableFilters, matchesQuery, sortRows, useTableQuery, type SortDirection} from "@/components/table-filters";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Table, TableBody, TableCell, TableHeader, TableRow} from "@/components/ui/table";
import {FinanceStatusBadge} from "@/modules/finance/components/finance-status-badge";
import {PaymentDialog} from "@/modules/finance/components/PaymentForm";
import {formatAmount} from "@/modules/finance/money-format";
import type {PaymentView} from "@/modules/finance/services/finance-analytics.service";

const STATUSES = ["confirmed", "rejected", "refunded"] as const;
const METHODS = ["cash", "bank_transfer", "card", "e_manat", "pos_terminal", "other"] as const;

type UnitOption = {id: string; unitNumber: string; entrance: number; floor: number; ownerName: string | null; ownerId: string | null};

export function PaymentsTable({rows, units, canWrite}: {
    rows: PaymentView[];
    units: UnitOption[];
    canWrite: boolean;
}) {
    const t = useTranslations("finance");
    const tc = useTranslations("common");
    const router = useRouter();
    const params = useTableQuery("payments");
    const [selected, setSelected] = useState<PaymentView | null>(null);
    const [registerOpen, setRegisterOpen] = useState(false);

    const query = params.value("q");
    const status = params.value("status");
    const method = params.value("method");
    const from = params.value("from");
    const to = params.value("to");
    const sortKey = params.value("sort");
    const sortDir: SortDirection = params.value("dir") === "desc" ? "desc" : "asc";

    const filtered = rows.filter((row) =>
        (!status || row.status === status) &&
        (!method || row.method === method) &&
        (!from || row.paymentDate >= from) &&
        (!to || row.paymentDate <= to) &&
        matchesQuery(query, [row.ownerName, row.unitNumber, row.referenceNo])
    );
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
    const hasFilters = Boolean(query || status || method || from || to);
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
                    <FilterSearch value={query} onChange={(value) => params.update({q: value})} placeholder={t("filters.searchPayments")} clearLabel={t("filters.clear")} />
                    <FilterSelect
                        label={t("filters.method")}
                        value={method}
                        onChange={(value) => params.update({method: value})}
                        options={[{value: "", label: t("filters.allMethods")}, ...METHODS.map((item) => ({value: item, label: t(`payments.paymentMethods.${item}`)}))]}
                    />
                    <FilterSelect
                        label={t("filters.status")}
                        value={status}
                        onChange={(value) => params.update({status: value})}
                        options={[{value: "", label: t("filters.allStatuses")}, ...STATUSES.map((item) => ({value: item, label: t(`payments.status.${item}`)}))]}
                    />
                    <DateRangePicker
                        value={{from: from ? new Date(`${from}T00:00:00`) : undefined, to: to ? new Date(`${to}T00:00:00`) : undefined}}
                        onChange={(range) => params.update({from: formatIsoDate(range.from), to: formatIsoDate(range.to)})}
                        placeholder={t("dateRange.placeholder")}
                        presets={[]}
                    />
                    <FilterReset active={hasFilters} onReset={() => params.update({q: "", status: "", method: "", from: "", to: ""})} label={t("filters.reset")} />
                </TableFilters>
                <div className="ml-auto flex flex-wrap items-center gap-3">
                    <p className="text-sm text-muted-foreground">{sorted.length} / {rows.length} {tc("pieces")}</p>
                    {canWrite && <Button size="sm" onClick={() => setRegisterOpen(true)}>+ {t("payments.register")}</Button>}
                </div>
            </div>

            <div className="surface-panel overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <SortableHead label={tc("date")} sortKey="date" sort={sort} onSort={toggle} />
                            <SortableHead label={t("payments.unit")} sortKey="unit" sort={sort} onSort={toggle} />
                            <SortableHead label={t("payments.owner")} sortKey="owner" sort={sort} onSort={toggle} />
                            <SortableHead label={tc("period")} sortKey="period" sort={sort} onSort={toggle} />
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
                                <TableCell className="text-sm text-muted-foreground">{row.paymentDate}</TableCell>
                                <TableCell className="text-sm">{row.unitNumber ?? "—"}</TableCell>
                                <TableCell className="text-sm">{row.ownerName ?? "—"}</TableCell>
                                <TableCell className="text-sm">{row.periodMonth}.{row.periodYear}</TableCell>
                                <TableCell className="text-right text-sm font-medium">{formatAmount(row.amount)}</TableCell>
                                <TableCell className="text-right text-sm text-success">{formatAmount(row.allocated)}</TableCell>
                                <TableCell className="text-right text-sm">{row.unallocated > 0 ? formatAmount(row.unallocated) : "—"}</TableCell>
                                <TableCell className="text-sm">{t(`payments.paymentMethods.${row.method}` as Parameters<typeof t>[0])}</TableCell>
                                <TableCell><FinanceStatusBadge kind="payment" status={row.status} /></TableCell>
                            </TableRow>
                        ))}
                        {sorted.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground/70">
                                    {rows.length === 0 ? t("payments.noPayments") : t("filters.notFound")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("payments.details")}</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                            <Detail label={tc("date")} value={selected.paymentDate} />
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
