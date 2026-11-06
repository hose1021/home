"use client";

import {useSearchParams} from "next/navigation";
import {useTranslations} from "next-intl";
import {Link, usePathname} from "@/i18n/navigation";
import {cn} from "@/lib/utils";
import {FinancePeriodPicker} from "@/modules/finance/components/finance-period-picker";

const items = [
    {key: "overview", href: "/finance"},
    {key: "charges", href: "/finance/charges"},
    {key: "payments", href: "/finance/payments"},
    {key: "debts", href: "/finance/debts"},
    {key: "expenses", href: "/finance/expenses"},
    {key: "settings", href: "/finance/settings"},
] as const;

/** Pages whose data is filtered by the shared period. */
const PERIOD_PATHS = ["/finance", "/finance/charges", "/finance/payments", "/finance/debts", "/finance/expenses"];

/** Shallow, persistent navigation across the finance module. */
export function FinanceNav() {
    const t = useTranslations("finance.nav");
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const period = new URLSearchParams();
    for (const key of ["month", "from", "to"]) {
        const item = searchParams.get(key);
        if (item) period.set(key, item);
    }
    const suffix = period.size > 0 ? `?${period}` : "";

    return (
        <nav aria-label={t("label")} className="flex flex-wrap items-center gap-1 border-b border-border">
            {items.map((item) => {
                const active = item.href === "/finance"
                    ? pathname === "/finance"
                    : pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.key}
                        href={`${item.href}${suffix}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                            "-mb-px inline-flex h-10 shrink-0 items-center border-b-2 px-3 text-sm font-bold transition-colors",
                            active
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {t(item.key)}
                    </Link>
                );
            })}
            {PERIOD_PATHS.includes(pathname) && (
                <div className="ml-auto flex shrink-0 items-center gap-1 pb-1">
                    <FinancePeriodPicker />
                </div>
            )}
        </nav>
    );
}
