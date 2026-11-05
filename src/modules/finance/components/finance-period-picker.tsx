"use client";

import {endOfMonth, startOfMonth, subDays, subMonths} from "date-fns";
import {usePathname, useRouter} from "next/navigation";
import {useTranslations} from "next-intl";

import {DateRangePicker, formatIsoDate, type DateRangePreset} from "@/components/date-range-picker";

/** Period for the overview. Unlike table filters, it changes server data, so it navigates. */
export function FinancePeriodPicker({from, to}: {from: string; to: string}) {
    const t = useTranslations("finance.dateRange");
    const router = useRouter();
    const pathname = usePathname();
    const today = new Date();
    const presets: DateRangePreset[] = [
        {label: t("today"), range: {from: today, to: today}},
        {label: t("last7"), range: {from: subDays(today, 6), to: today}},
        {label: t("last30"), range: {from: subDays(today, 29), to: today}},
        {label: t("thisMonth"), range: {from: startOfMonth(today), to: endOfMonth(today)}},
        {label: t("lastMonth"), range: {from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1))}},
        {label: t("last3Months"), range: {from: startOfMonth(subMonths(today, 2)), to: today}},
    ];

    function apply(range: {from?: Date; to?: Date}) {
        const params = new URLSearchParams(window.location.search);
        const nextFrom = formatIsoDate(range.from);
        const nextTo = formatIsoDate(range.to);
        if (nextFrom) params.set("from", nextFrom); else params.delete("from");
        if (nextTo) params.set("to", nextTo); else params.delete("to");
        const query = params.toString();
        router.replace(`${pathname}${query ? `?${query}` : ""}`);
    }

    return (
        <DateRangePicker
            value={{
                from: from ? new Date(`${from}T00:00:00`) : undefined,
                to: to ? new Date(`${to}T00:00:00`) : undefined,
            }}
            onChange={apply}
            placeholder={t("placeholder")}
            presets={presets}
        />
    );
}
