import {cn} from "@/lib/utils";

export function MetricCard({label, value, hint, tone = "default", title}: {
    label: string;
    value: string;
    hint?: string;
    tone?: "default" | "success" | "danger" | "warning";
    title?: string;
}) {
    return (
        <div className="surface-panel p-4" title={title}>
            <p className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground">{label}</p>
            <p className={cn(
                "amount mt-2 text-xl font-semibold tabular-nums",
                tone === "success" && "text-success",
                tone === "danger" && "text-danger",
                tone === "warning" && "text-warning",
            )}>
                {value}
            </p>
            {hint && <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{hint}</p>}
        </div>
    );
}
