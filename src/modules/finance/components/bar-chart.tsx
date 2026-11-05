import {cn} from "@/lib/utils";

export type BarSeries = {label: string; color: string; values: number[]};

/** Minimal, dependency-free grouped bar chart over real aggregates. */
export function BarChart({data, series, format, height = 150, ariaLabel}: {
    data: {label: string}[];
    series: BarSeries[];
    format: (value: number) => string;
    height?: number;
    ariaLabel: string;
}) {
    const max = Math.max(1, ...series.flatMap((item) => item.values));

    return (
        <div>
            <div className="flex items-end gap-2" style={{height}} role="img" aria-label={ariaLabel}>
                {data.map((point, index) => (
                    <div key={point.label} className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5">
                        {series.map((item) => {
                            const value = item.values[index] ?? 0;
                            return (
                                <div
                                    key={item.label}
                                    title={`${item.label}: ${format(value)}`}
                                    className={cn("w-2.5 rounded-t-[2px]", item.color)}
                                    style={{height: `${Math.max(value > 0 ? 3 : 0, (value / max) * 100)}%`}}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="mt-2 flex gap-2">
                {data.map((point) => (
                    <span key={point.label} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground">
                        {point.label}
                    </span>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
                {series.map((item) => (
                    <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("size-2 rounded-[1px]", item.color)} aria-hidden />
                        {item.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
