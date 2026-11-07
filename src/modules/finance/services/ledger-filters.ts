import {matchesQuery} from "@/lib/search";
import {isWholeMonth, periodKey} from "../period";
import type {ChargeView, PaymentView} from "./finance-analytics.service";

export type LedgerPeriod = {from: string; to: string};

export type LedgerFilter = {
    query?: string;
    status?: string;
    period?: LedgerPeriod;
};

/**
 * A selected whole month means "the charges billed for that month", not "charges due inside it":
 * the due date falls in the next month, so the two rules differ by one row.
 */
export function chargeInPeriod(row: ChargeView, period: LedgerPeriod): boolean {
    if (isWholeMonth(period.from, period.to)) {
        return periodKey(row.periodYear, row.periodMonth) === period.from.slice(0, 7);
    }
    return (!period.from || row.dueDate >= period.from) && (!period.to || row.dueDate <= period.to);
}

/** One charge filter for the charges table and the CSV export. */
export function filterChargeViews(rows: ChargeView[], filter: LedgerFilter = {}): ChargeView[] {
    return rows.filter((row) =>
        (!filter.status || row.status === filter.status) &&
        (!filter.period || chargeInPeriod(row, filter.period)) &&
        matchesQuery(filter.query ?? "", [row.ownerName, row.unitNumber]),
    );
}

/** One payment filter for the payments table and the CSV export. */
export function filterPaymentViews(
    rows: PaymentView[],
    filter: LedgerFilter & {method?: string} = {},
): PaymentView[] {
    const period = filter.period;
    return rows.filter((row) =>
        (!filter.status || row.status === filter.status) &&
        (!filter.method || row.method === filter.method) &&
        (!period?.from || row.paymentDate >= period.from) &&
        (!period?.to || row.paymentDate <= period.to) &&
        matchesQuery(filter.query ?? "", [row.ownerName, row.unitNumber, row.referenceNo]),
    );
}
