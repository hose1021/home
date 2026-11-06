import {Table} from "@/components/ui/table";

/** Financial table frame: compact rows, hairline dividers, no card-in-card borders. */
export function FinanceTable({children}: {children: React.ReactNode}) {
    return (
        <div className="surface-panel overflow-hidden [&_th]:h-9 [&_th]:px-3 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.06em] [&_td]:px-3 [&_td]:py-2.5 [&_tbody_tr:last-child]:border-0">
            <Table>{children}</Table>
        </div>
    );
}
