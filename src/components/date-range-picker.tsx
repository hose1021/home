"use client";

import {IconCalendar} from "@tabler/icons-react";
import {endOfMonth, format, startOfMonth, subDays, subMonths} from "date-fns";
import {az, enUS, ru} from "date-fns/locale";
import {useLocale, useTranslations} from "next-intl";
import * as React from "react";

import {Button} from "@/components/ui/button";
import {Calendar} from "@/components/ui/calendar";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {cn} from "@/lib/utils";
import {monthBounds} from "@/modules/finance/period";

export type DateRangeSelection = {month?: string; from?: Date; to?: Date};

const LOCALES = {ru, az, en: enUS};

/** Local calendar date as `YYYY-MM-DD`, without a timezone shift. */
export function formatIsoDate(date?: Date): string {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthDate(month: string): Date {
    const [year = 1970, monthNumber = 1] = month.split("-").map(Number);
    return new Date(year, monthNumber - 1, 1);
}

function parseIso(iso: string): Date {
    const [year = 1970, monthNumber = 1, day = 1] = iso.split("-").map(Number);
    return new Date(year, monthNumber - 1, day);
}

export function DateRangePicker({value, onChange, placeholder, applyLabel}: {
    value: DateRangeSelection;
    onChange: (value: DateRangeSelection) => void;
    placeholder: string;
    applyLabel: string;
}) {
    const t = useTranslations("finance.dateRange");
    const localeKey = useLocale() as keyof typeof LOCALES;
    const locale = LOCALES[localeKey] ?? ru;
    const [open, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<"month" | "range">(value.month ? "month" : "range");
    // Selection is pending until confirmed: react-day-picker reports `from` and `to` on the
    // first click of an empty range, so committing in onSelect would close on one click.
    const [draft, setDraft] = React.useState<DateRangeSelection>(value);
    const [year, setYear] = React.useState(() => (value.month ? Number(value.month.slice(0, 4)) : new Date().getFullYear()));

    const days = (date: Date) => format(date, "d MMM yyyy", {locale});
    const selected = draft.from ? {from: draft.from, to: draft.to} : undefined;
    const complete = mode === "month" ? Boolean(draft.month) : Boolean(draft.from && draft.to);
    const label = value.month
        ? format(monthDate(value.month), "LLLL yyyy", {locale}).replace(/^./, (letter) => letter.toUpperCase())
        : value.from
            ? value.to
                ? `${days(value.from)} — ${days(value.to)}`
                : days(value.from)
            : placeholder;

    function switchMode(next: "month" | "range") {
        setMode(next);
        if (next === "range" && draft.month) {
            const bounds = monthBounds(draft.month);
            setDraft({from: parseIso(bounds.from), to: parseIso(bounds.to)});
        }
    }

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                if (next) {
                    setDraft(value);
                    setMode(value.month ? "month" : "range");
                    setYear(value.month ? Number(value.month.slice(0, 4)) : new Date().getFullYear());
                }
                setOpen(next);
            }}
        >
            <PopoverTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        className={cn("h-10 max-w-72 justify-start gap-2 px-3 text-sm font-medium", !value.month && !value.from && "text-muted-foreground")}
                    >
                        <IconCalendar className="size-4 shrink-0" />
                        <span className="truncate">{label}</span>
                    </Button>
                }
            />
            <PopoverContent className="w-auto min-w-[288px] p-0" align="end">
                <div className="flex gap-1 border-b p-2" role="tablist" aria-label={t("mode")}>
                    {(["month", "range"] as const).map((item) => (
                        <button
                            key={item}
                            type="button"
                            role="tab"
                            aria-selected={mode === item}
                            onClick={() => switchMode(item)}
                            className={cn(
                                "h-8 flex-1 rounded-[4px] px-3 text-xs font-bold transition-colors",
                                mode === item ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {t(item)}
                        </button>
                    ))}
                </div>

                {mode === "range" ? (
                    <div className="flex flex-col sm:flex-row">
                        <div className="flex flex-col gap-1 border-b p-2 sm:border-r sm:border-b-0">
                            {([
                                {key: "today", range: {from: new Date(), to: new Date()}},
                                {key: "last7", range: {from: subDays(new Date(), 6), to: new Date()}},
                                {key: "last30", range: {from: subDays(new Date(), 29), to: new Date()}},
                                {key: "thisMonth", range: {from: startOfMonth(new Date()), to: endOfMonth(new Date())}},
                                {key: "lastMonth", range: {from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1))}},
                                {key: "last3Months", range: {from: startOfMonth(subMonths(new Date(), 2)), to: new Date()}},
                            ] as const).map((preset) => (
                                <Button
                                    key={preset.key}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start font-medium"
                                    onClick={() => setDraft(preset.range)}
                                >
                                    {t(preset.key)}
                                </Button>
                            ))}
                        </div>
                        <Calendar
                            mode="range"
                            numberOfMonths={1}
                            selected={selected}
                            defaultMonth={draft.from ?? new Date()}
                            locale={locale}
                            onSelect={(next) => setDraft(next?.from ? {from: next.from, to: next.to} : {})}
                        />
                    </div>
                ) : (
                    <div className="w-64 p-2">
                        <div className="mb-2 flex items-center justify-between">
                            <Button type="button" variant="ghost" size="sm" aria-label={t("prevYear")} onClick={() => setYear((current) => current - 1)}>
                                ‹
                            </Button>
                            <span className="amount text-sm font-semibold tabular-nums">{year}</span>
                            <Button type="button" variant="ghost" size="sm" aria-label={t("nextYear")} onClick={() => setYear((current) => current + 1)}>
                                ›
                            </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                            {Array.from({length: 12}, (_, index) => {
                                const key = `${year}-${String(index + 1).padStart(2, "0")}`;
                                const active = draft.month === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setDraft({month: key})}
                                        className={cn(
                                            "h-9 rounded-[4px] text-xs font-medium capitalize transition-colors",
                                            active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                        )}
                                    >
                                        {format(new Date(year, index, 1), "LLL", {locale})}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex justify-end border-t p-2">
                    <Button
                        type="button"
                        size="sm"
                        disabled={!complete}
                        onClick={() => {
                            onChange(draft);
                            setOpen(false);
                        }}
                    >
                        {applyLabel}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
