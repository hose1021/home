const formatter = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** Locale-stable money for tables and cards: "5 725,22 ₼". */
export function formatAmount(value: number | string, currency = "₼"): string {
    const amount = Number(value);
    return `${formatter.format(Number.isFinite(amount) ? amount : 0)} ${currency}`;
}

/** Same number without currency, for compact chart labels. */
export function formatNumber(value: number | string): string {
    const amount = Number(value);
    return formatter.format(Number.isFinite(amount) ? amount : 0);
}

/** `YYYY-MM-DD` as the active locale's short date; dash for a missing value. */
export function formatDate(iso: string, locale = "ru-RU"): string {
    if (!iso) return "—";
    const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return iso;
    return new Intl.DateTimeFormat(locale, {day: "2-digit", month: "2-digit", year: "numeric"}).format(new Date(year, month - 1, day));
}
