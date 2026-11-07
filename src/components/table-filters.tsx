"use client";

import {IconArrowDown, IconArrowUp, IconSearch, IconSelector, IconX} from "@tabler/icons-react";
import {useSearchParams} from "next/navigation";
import {useCallback} from "react";
import {Input} from "@/components/ui/input";
import {TableHead} from "@/components/ui/table";
import {cn} from "@/lib/utils";

type FilterOption = {value: string; label: string};
export type SortDirection = "asc" | "desc";

export function TableFilters({children, className}: {children: React.ReactNode; className?: string}) {
    return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function FilterSearch({value, onChange, placeholder, clearLabel, className}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    clearLabel: string;
    className?: string;
}) {
    return (
        <div className={cn("relative", className)}>
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="w-72 pl-9 pr-8"
            />
            {value && (
                <button
                    type="button"
                    aria-label={clearLabel}
                    onClick={() => onChange("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                >
                    <IconX className="size-4" />
                </button>
            )}
        </div>
    );
}

export function FilterSelect({value, onChange, options, label}: {
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    label: string;
}) {
    return (
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={label}
            className="filter-select w-auto"
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </select>
    );
}

export function FilterReset({active, onReset, label}: {active: boolean; onReset: () => void; label: string}) {
    if (!active) return null;
    return (
        <button
            type="button"
            onClick={onReset}
            className="h-10 px-2 text-sm font-bold text-primary transition-colors hover:text-brand-soft"
        >
            {label}
        </button>
    );
}

export {matchesQuery} from "@/lib/search";

/**
 * Table state is stored in the URL under a namespace: filters, sorting and the active
 * tab survive reloads and can be copied as a link. history.replaceState keeps it local,
 * with no server round-trip.
 */
type TableQuery = {
    value: (key: string) => string;
    update: (patch: Record<string, string>) => void;
};

export function useTableQuery(prefix: string): TableQuery {
    const searchParams = useSearchParams();

    const name = useCallback((key: string) => (prefix ? `${prefix}.${key}` : key), [prefix]);

    const value = useCallback(
        (key: string) => searchParams.get(name(key)) ?? "",
        [searchParams, name],
    );

    const update = useCallback(
        (patch: Record<string, string>) => {
            const params = new URLSearchParams(window.location.search);
            for (const [key, next] of Object.entries(patch)) {
                const param = name(key);
                if (next) params.set(param, next);
                else params.delete(param);
            }
            const query = params.toString();
            window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
        },
        [name],
    );

    return {value, update};
}

export function sortRows<T>(
    rows: T[],
    key: string,
    direction: SortDirection,
    accessors: Record<string, (row: T) => string | number | null | undefined>,
): T[] {
    const accessor = accessors[key];
    if (!accessor) return rows;
    const factor = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
        const left = accessor(a);
        const right = accessor(b);
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;
        const result = typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right), "ru");
        return result * factor;
    });
}

export function SortableHead({label, sortKey, sort, onSort, align}: {
    label: string;
    sortKey: string;
    sort: {key: string; direction: SortDirection};
    onSort: (key: string) => void;
    align?: "left" | "right";
}) {
    const active = sort.key === sortKey;
    const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";

    return (
        <TableHead aria-sort={ariaSort} className={align === "right" ? "text-right" : undefined}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={cn(
                    "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                    active && "text-foreground",
                    align === "right" && "flex-row-reverse",
                )}
            >
                {label}
                {active
                    ? sort.direction === "asc"
                        ? <IconArrowUp className="size-3.5" />
                        : <IconArrowDown className="size-3.5" />
                    : <IconSelector className="size-3.5 opacity-40" />}
            </button>
        </TableHead>
    );
}
