import {describe, expect, it} from "vitest";
import {filterChargeViews, filterPaymentViews, type LedgerPeriod} from "./ledger-filters";
import type {ChargeView, PaymentView} from "./finance-analytics.service";

const charge = (overrides: Partial<ChargeView>): ChargeView => ({
    id: "charge-1",
    ownerId: "owner-1",
    ownerName: "Aliyev",
    unitNumber: "12",
    dueDate: "2026-06-15",
    periodYear: 2026,
    periodMonth: 5,
    amount: 100,
    paid: 0,
    outstanding: 100,
    status: "pending",
    ...overrides,
});

const payment = (overrides: Partial<PaymentView>): PaymentView => ({
    id: "payment-1",
    ownerId: "owner-1",
    ownerName: "Aliyev",
    unitNumber: "12",
    paymentDate: "2026-05-10",
    periodYear: 2026,
    periodMonth: 5,
    amount: 100,
    allocated: 100,
    unallocated: 0,
    method: "cash",
    referenceNo: null,
    status: "confirmed",
    ...overrides,
});

const may: LedgerPeriod = {from: "2026-05-01", to: "2026-05-31"};

describe("chargeInPeriod", () => {
    it("matches a whole month by billing period, not by due date", () => {
        const mayChargeDueInJune = charge({periodYear: 2026, periodMonth: 5, dueDate: "2026-06-15"});
        const juneChargeDueInJune = charge({id: "charge-2", periodYear: 2026, periodMonth: 6, dueDate: "2026-07-15"});

        expect(filterChargeViews([mayChargeDueInJune, juneChargeDueInJune], {period: may})).toEqual([mayChargeDueInJune]);
    });

    it("matches a partial range by due date", () => {
        const mayChargeDueInJune = charge({periodYear: 2026, periodMonth: 5, dueDate: "2026-06-15"});
        const range: LedgerPeriod = {from: "2026-06-10", to: "2026-06-20"};

        expect(filterChargeViews([mayChargeDueInJune], {period: range})).toEqual([mayChargeDueInJune]);
    });

    it("keeps every row when no period is selected", () => {
        expect(filterChargeViews([charge({}), charge({id: "charge-2"})])).toHaveLength(2);
    });
});

describe("filterChargeViews", () => {
    it("filters by status and query", () => {
        const rows = [charge({}), charge({id: "charge-2", ownerName: "Mammadov", status: "paid"})];

        expect(filterChargeViews(rows, {status: "paid"})).toHaveLength(1);
        expect(filterChargeViews(rows, {query: "mammad"})).toEqual([rows[1]]);
    });
});

describe("filterPaymentViews", () => {
    it("filters by status, method, period and reference", () => {
        const rows = [
            payment({}),
            payment({id: "payment-2", status: "pending", method: "bank_transfer", referenceNo: "REF-77"}),
            payment({id: "payment-3", paymentDate: "2026-04-30"}),
        ];

        expect(filterPaymentViews(rows, {status: "confirmed"})).toHaveLength(2);
        expect(filterPaymentViews(rows, {method: "bank_transfer"})).toEqual([rows[1]]);
        expect(filterPaymentViews(rows, {period: may})).toHaveLength(2);
        expect(filterPaymentViews(rows, {query: "ref-77"})).toEqual([rows[1]]);
    });
});
