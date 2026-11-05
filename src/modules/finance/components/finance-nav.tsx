"use client";

import {useTranslations} from "next-intl";
import {Link, usePathname} from "@/i18n/navigation";
import {cn} from "@/lib/utils";

const items = [
    {key: "overview", href: "/finance"},
    {key: "charges", href: "/finance/charges"},
    {key: "payments", href: "/finance/payments"},
    {key: "debts", href: "/finance/debts"},
    {key: "expenses", href: "/finance/expenses"},
    {key: "settings", href: "/finance/settings"},
] as const;

/** Shallow, persistent navigation across the finance module. */
export function FinanceNav() {
    const t = useTranslations("finance.nav");
    const pathname = usePathname();

    return (
        <nav aria-label={t("label")} className="flex gap-1 overflow-x-auto border-b border-border">
            {items.map((item) => {
                const active = item.href === "/finance"
                    ? pathname === "/finance"
                    : pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.key}
                        href={item.href}
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
        </nav>
    );
}
