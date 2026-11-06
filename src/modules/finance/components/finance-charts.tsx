"use client";

import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";

import {formatAmount} from "@/modules/finance/money-format";

type SeriesPoint = {label: string; [key: string]: string | number};

function ChartTooltip({active, payload, label}: {
    active?: boolean;
    payload?: {name?: string; value?: number | string; color?: string}[];
    label?: string | number;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-[4px] border border-border bg-popover px-3 py-2 text-xs shadow-sm">
            <p className="mb-1 font-semibold text-foreground">{label}</p>
            {payload.map((item) => (
                <p key={item.name} className="flex items-center justify-between gap-4 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="size-1.5 rounded-[1px]" style={{backgroundColor: item.color}} aria-hidden />
                        {item.name}
                    </span>
                    <span className="amount font-semibold text-foreground">{formatAmount(Number(item.value ?? 0))}</span>
                </p>
            ))}
        </div>
    );
}

function Legend({items}: {items: {label: string; color: string}[]}) {
    return (
        <div className="mt-3 flex flex-wrap gap-4">
            {items.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-2 rounded-[1px]" style={{backgroundColor: item.color}} aria-hidden />
                    {item.label}
                </span>
            ))}
        </div>
    );
}

const axisProps = {
    tickLine: false,
    axisLine: false,
    tick: {fill: "var(--muted-foreground)", fontSize: 11},
} as const;

/** Grouped monthly bars: charged against received. */
export function DualBarChart({data, series, ariaLabel, height = 220}: {
    data: SeriesPoint[];
    series: {key: string; label: string; color: string}[];
    ariaLabel: string;
    height?: number;
}) {
    if (data.length === 0) {
        return <p className="py-10 text-center text-sm text-muted-foreground">—</p>;
    }

    return (
        <div>
            <div style={{height}} role="img" aria-label={ariaLabel}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{top: 4, right: 4, left: -12, bottom: 0}} barGap={2}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
                        <XAxis dataKey="label" {...axisProps} tickMargin={8} />
                        <YAxis {...axisProps} width={56} tickFormatter={(value: number) => new Intl.NumberFormat("ru-RU", {notation: "compact", maximumFractionDigits: 1}).format(value)} />
                        <Tooltip cursor={{fill: "var(--muted)", opacity: 0.4}} content={<ChartTooltip />} />
                        {series.map((item) => (
                            <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color} radius={[2, 2, 0, 0]} maxBarSize={22} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <Legend items={series} />
        </div>
    );
}

/** Horizontal ranked bars for ageing and category breakdowns. */
export function RankedBarChart({data, color, ariaLabel, height = 200}: {
    data: {label: string; value: number}[];
    color: string;
    ariaLabel: string;
    height?: number;
}) {
    if (data.length === 0) {
        return <p className="py-10 text-center text-sm text-muted-foreground">—</p>;
    }

    return (
        <div style={{height}} role="img" aria-label={ariaLabel}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{top: 0, right: 8, left: 0, bottom: 0}}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="2 4" />
                    <XAxis type="number" {...axisProps} tickFormatter={(value: number) => new Intl.NumberFormat("ru-RU", {notation: "compact", maximumFractionDigits: 1}).format(value)} />
                    <YAxis type="category" dataKey="label" {...axisProps} width={122} />
                    <Tooltip cursor={{fill: "var(--muted)", opacity: 0.4}} content={<ChartTooltip />} />
                    <Bar dataKey="value" name={ariaLabel} fill={color} radius={[0, 2, 2, 0]} maxBarSize={16} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
