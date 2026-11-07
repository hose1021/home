"use client";

import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useTranslations} from "next-intl";

import {isoDate, resolvePeriod} from "@/modules/finance/period";
import {DateRangePicker, type DateRangeSelection} from "./date-range-picker";

const toDate = (iso: string) => (iso ? new Date(`${iso}T00:00:00`) : undefined);

/** Shared `month` / `from`+`to` period for every finance tab; state lives in the URL. */
export function FinancePeriodPicker() {
    const t = useTranslations("finance.dateRange");
    const tf = useTranslations("finance");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const period = resolvePeriod({
        month: searchParams.get("month"),
        from: searchParams.get("from"),
        to: searchParams.get("to"),
    });
    const explicit = searchParams.has("month") || searchParams.has("from") || searchParams.has("to");

    function apply(selection: DateRangeSelection) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("month");
        params.delete("from");
        params.delete("to");

        if (selection.month) {
            params.set("month", selection.month);
        } else {
            const from = selection.from ? isoDate(selection.from) : "";
            const to = selection.to ? isoDate(selection.to) : "";
            if (from) params.set("from", from);
            if (to) params.set("to", to);
        }

        const query = params.toString();
        router.replace(`${pathname}${query ? `?${query}` : ""}`);
    }

    return (
        <>
            <DateRangePicker
                value={{month: period.month || undefined, from: toDate(period.from), to: toDate(period.to)}}
                onChange={apply}
                placeholder={t("placeholder")}
                applyLabel={t("apply")}
            />
            {explicit && (
                <button
                    type="button"
                    onClick={() => apply({})}
                    className="h-10 px-2 text-sm font-bold text-primary transition-colors hover:text-brand-soft"
                >
                    {tf("filters.reset")}
                </button>
            )}
        </>
    );
}
