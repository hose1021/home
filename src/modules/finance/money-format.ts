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
