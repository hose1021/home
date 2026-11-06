"use client";

import {useLocale, useTranslations} from "next-intl";

import {FilterSearch, FilterSelect, TableFilters, matchesQuery, useTableQuery} from "@/components/table-filters";
import {TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Link} from "@/i18n/navigation";
import {FinanceTable} from "@/modules/finance/components/finance-table";
import {formatAmount, formatDate} from "@/modules/finance/money-format";
import type {DebtorRow} from "@/modules/finance/services/finance-analytics.service";

const BUCKETS = ["notDue", "days1to30", "days31to60", "days61to90", "over90"] as const;

function bucketOf(days: number): (typeof BUCKETS)[number] {
    if (days <= 0) return "notDue";
    if (days <= 30) return "days1to30";
    if (days <= 60) return "days31to60";
    if (days <= 90) return "days61to90";
    return "over90";
}

export function DebtorsTable({rows}: {rows: DebtorRow[]}) {
    const t = useTranslations("finance");
    const tc = useTranslations("common");
    const locale = useLocale();
    const params = useTableQuery("debtors");
    const query = params.value("q");
    const bucket = params.value("bucket");

    const filtered = rows.filter((row) =>
        (!bucket || bucketOf(row.daysOverdue) === bucket) &&
        matchesQuery(query, [row.ownerName, ...row.unitNumbers])
    );

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                <TableFilters>
                    <FilterSearch value={query} onChange={(value) => params.update({q: value})} placeholder={t("debtors.search")} clearLabel={t("filters.clear")} />
                    <FilterSelect
                        label={t("analytics.ageing")}
                        value={bucket}
                        onChange={(value) => params.update({bucket: value})}
                        options={[
                            {value: "", label: t("filters.all")},
                            ...BUCKETS.map((item) => ({value: item, label: t(`analytics.${item === "notDue" ? "notDue" : item}`)})),
                        ]}
                    />
                </TableFilters>
                <p className="ml-auto text-xs text-muted-foreground tabular-nums">{filtered.length} / {rows.length} {tc("pieces")}</p>
            </div>

            <FinanceTable>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("debtors.owner")}</TableHead>
                            <TableHead>{t("debtors.units")}</TableHead>
                            <TableHead className="text-right">{t("debtors.outstanding")}</TableHead>
                            <TableHead>{t("debtors.oldest")}</TableHead>
                            <TableHead className="text-right">{t("debtors.days")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((row) => (
                            <TableRow key={row.ownerId} className="cursor-pointer">
                                <TableCell className="text-sm font-medium">
                                    <Link href={`/finance/debts/${row.ownerId}`} className="hover:text-primary">{row.ownerName}</Link>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{row.unitNumbers.join(", ")}</TableCell>
                                <TableCell className="text-right text-sm font-semibold tabular-nums">{formatAmount(row.outstanding)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground tabular-nums">{row.oldestDueDate ? formatDate(row.oldestDueDate, locale) : "—"}</TableCell>
                                <TableCell className={row.daysOverdue > 90 ? "text-right text-sm tabular-nums text-danger" : "text-right text-sm tabular-nums"}>{row.daysOverdue}</TableCell>
                            </TableRow>
                        ))}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">{t("debtors.empty")}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
            </FinanceTable>
        </>
    );
}
