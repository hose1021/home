import {cn} from "@/lib/utils";

type Tone = "default" | "success" | "danger" | "warning";

const toneClass: Record<Tone, string> = {
    default: "text-foreground",
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
};

/** Headline figure: one per core financial fact. */
export function PrimaryMetric({label, value, hint, tone = "default"}: {
    label: string;
    value: string;
    hint?: string;
    tone?: Tone;
}) {
    return (
        <div className="surface-panel flex flex-col p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</p>
            <p className={cn("amount mt-2 text-3xl font-semibold leading-none tabular-nums", toneClass[tone])}>{value}</p>
            {hint && <p className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</p>}
        </div>
    );
}

/** Low-emphasis figures that support the headline ones. */
export function MetricStrip({items}: {items: {label: string; value: string; tone?: Tone}[]}) {
    return (
        <div className="surface-panel grid gap-px overflow-hidden sm:grid-cols-3">
            {items.map((item) => (
                <div key={item.label} className="bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{item.label}</p>
                    <p className={cn("amount mt-1 text-lg font-semibold tabular-nums", toneClass[item.tone ?? "default"])}>{item.value}</p>
                </div>
            ))}
        </div>
    );
}

/** Section plate shared by charts and lists. */
export function FinancePanel({title, hint, action, className, children}: {
    title: string;
    hint?: string;
    action?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <section className={cn("surface-panel flex min-w-0 flex-col", className)}>
            <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                <div className="min-w-0">
                    <h2 className="font-heading text-sm font-bold">{title}</h2>
                    {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
                </div>
                {action}
            </div>
            <div className="min-w-0 flex-1 px-4 pb-4">{children}</div>
        </section>
    );
}
