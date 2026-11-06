import type {ReactNode} from "react";

/** Compact module header: one heading, one supporting line, optional actions. */
export function FinancePageHeader({title, description, children}: {
    title: string;
    description?: string;
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
        </div>
    );
}
