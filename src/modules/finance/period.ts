/** One period model for every finance screen: a whole month or an explicit date range. */
export type FinancePeriod = {month: string; from: string; to: string};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number): string {
    return String(value).padStart(2, "0");
}

export function isoDate(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthBounds(month: string): {from: string; to: string} {
    const [year = 1970, monthNumber = 1] = month.split("-").map(Number);
    return {from: `${month}-01`, to: isoDate(new Date(year, monthNumber, 0))};
}

/**
 * Default is the same six-month window the overview charts use, so every tab opens on
 * meaningful data and the control always shows the range it applies.
 */
export function resolvePeriod(params: {from?: string | null; to?: string | null; month?: string | null}, now = new Date()): FinancePeriod {
    const month = MONTH.test(params.month ?? "") ? (params.month as string) : "";
    if (month) return {month, ...monthBounds(month)};

    const from = DAY.test(params.from ?? "") ? (params.from as string) : "";
    const to = DAY.test(params.to ?? "") ? (params.to as string) : "";
    if (from || to) return {month: "", from, to};

    return {month: "", from: isoDate(new Date(now.getFullYear(), now.getMonth() - 5, 1)), to: isoDate(now)};
}

/** True when the range is exactly one calendar month, so charge rows filter by billing period. */
export function isWholeMonth(from: string, to: string): boolean {
    if (!from || !to || from.slice(0, 7) !== to.slice(0, 7)) return false;
    const bounds = monthBounds(from.slice(0, 7));
    return bounds.from === from && bounds.to === to;
}
