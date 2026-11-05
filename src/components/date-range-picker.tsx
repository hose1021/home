"use client";

import {IconCalendar} from "@tabler/icons-react";
import {format} from "date-fns";
import {az, enUS, ru} from "date-fns/locale";
import {useLocale} from "next-intl";
import * as React from "react";

import {Button} from "@/components/ui/button";
import {Calendar} from "@/components/ui/calendar";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {cn} from "@/lib/utils";

export type DateRangeValue = {from?: Date; to?: Date};
export type DateRangePreset = {label: string; range: DateRangeValue};

const LOCALES = {ru, az, en: enUS};

/** Local calendar date as `YYYY-MM-DD`, without a timezone shift. */
export function formatIsoDate(date?: Date): string {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function DateRangePicker({value, onChange, placeholder, presets}: {
    value: DateRangeValue;
    onChange: (value: DateRangeValue) => void;
    placeholder: string;
    presets: DateRangePreset[];
}) {
    const [open, setOpen] = React.useState(false);
    const locale = LOCALES[useLocale() as keyof typeof LOCALES] ?? ru;
    const display = (date: Date) => format(date, "d MMM yyyy", {locale});
    const selected = value.from ? {from: value.from, to: value.to} : undefined;
    const label = value.from
        ? value.to
            ? `${display(value.from)} — ${display(value.to)}`
            : display(value.from)
        : placeholder;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        className={cn("h-10 max-w-72 justify-start gap-2 px-3 text-sm font-medium", !value.from && "text-muted-foreground")}
                    >
                        <IconCalendar className="size-4 shrink-0" />
                        <span className="truncate">{label}</span>
                    </Button>
                }
            />
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex flex-col sm:flex-row">
                    <div className="flex flex-col gap-1 border-b p-2 sm:border-r sm:border-b-0">
                        {presets.map((preset) => (
                            <Button
                                key={preset.label}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-start font-medium"
                                onClick={() => {
                                    onChange(preset.range);
                                    setOpen(false);
                                }}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                    <Calendar
                        mode="range"
                        numberOfMonths={1}
                        selected={selected}
                        defaultMonth={value.from ?? new Date()}
                        locale={locale}
                        onSelect={(next) => {
                            onChange(next?.from ? {from: next.from, to: next.to} : {});
                            if (next?.from && next?.to) setOpen(false);
                        }}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}
