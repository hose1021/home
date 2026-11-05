"use client";

import {useSearchParams} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import {usePathname, useRouter} from "@/i18n/navigation";
import {routing, type Locale} from "@/i18n/routing";
import {cn} from "@/lib/utils";

const LABELS: Record<Locale, string> = {ru: "RU", az: "AZ", en: "EN"};

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  function switchTo(next: Locale) {
    const query = Object.fromEntries(searchParams.entries());
    router.replace({pathname, query}, {locale: next});
  }

  return (
    <div role="group" aria-label={t("language")} className="flex items-center gap-0.5">
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          aria-pressed={code === locale}
          className={cn(
            "h-7 rounded-[4px] px-2 text-[11px] font-bold uppercase tracking-[0.6px] transition-colors",
            code === locale
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          )}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
