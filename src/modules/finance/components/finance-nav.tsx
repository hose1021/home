"use client";

import {useSearchParams} from "next/navigation";
import {useTranslations} from "next-intl";
import {Link, usePathname} from "@/i18n/navigation";
import {cn} from "@/lib/utils";
import {FinancePeriodPicker} from "@/modules/finance/components/finance-period-picker";

const items = [
    {key: "overview", href: "/finance", period: true},
    {key: "charges", href: "/finance/charges", period: true},
    {key: "payments", href: "/finance/payments", period: true},
    {key: "debts", href: "/finance/debts", period: true},
    {key: "expenses", href: "/finance/expenses", period: true},
    {key: "settings", href: "/finance/settings", period: false},
] as const;

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
    const activeItem = items.find((item) =>
        item.href === "/finance" ? pathname === "/finance" : pathname.startsWith(item.href));

    return (
        <nav aria-label={t("label")} className="flex flex-wrap items-center gap-1 border-b border-border">
            {items.map((item) => {
                const active = item === activeItem;
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
            {activeItem?.period && (
                <div className="ml-auto flex shrink-0 items-center gap-1 pb-1">
                    <FinancePeriodPicker />
                </div>
            )}
        </nav>
    );
}
