import type {ReactNode} from "react";

export function FinancePageHeader({eyebrow, title, description, children}: {
    eyebrow: string;
    title: string;
    description?: string;
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{eyebrow}</p>
                <h1 className="page-heading mt-1">{title}</h1>
                {description && <p className="page-description">{description}</p>}
            </div>
            {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
        </div>
    );
}
