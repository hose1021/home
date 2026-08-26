import {describe, expect, it} from "vitest";
import {computeDebtByOwner} from "./report.service";
import {buildPeriods, unitDebt, type BillingPeriod, type DebtConfig} from "@/modules/finance/services/debt.service";
import {formatMoney, moneyToCents} from "@/modules/finance/services/money";

const cfg: DebtConfig = {tariffPerSqm: 0.4, billingStart: "2025-01"};

describe("computeDebtByOwner", () => {
  const now = new Date(2025, 2, 15); // Mar 2025 → periods 2025-01..2025-03
  const unitRows = [
    {ownerId: "o1", ownerName: "Alice", unitId: "u1", unitNumber: "1", area: "50"}, // fee 20/period
    {ownerId: "o1", ownerName: "Alice", unitId: "u2", unitNumber: "2", area: "25"}, // fee 10/period
    {ownerId: "o2", ownerName: "Bob", unitId: "u3", unitNumber: "3", area: "100"}, // fee 40/period
  ];
  const paidByPeriod = new Map<string, Map<string, number>>([
    ["u1", new Map([["2025-1", 20], ["2025-2", 20]])], // Jan, Feb fully paid; Mar unpaid
    ["u3", new Map([["2025-1", 30]])], // partial
  ]);
  const paidByOwner = new Map([["o1", 40], ["o2", 30]]);

  it("aggregates canonical per-unit unitDebt into per-owner rows", () => {
    const report = computeDebtByOwner(unitRows, paidByPeriod, paidByOwner, cfg, now);

    expect(report).toEqual([
      {ownerName: "Bob", units: "3", charged: "120.00", paid: "30.00", debt: "90.00"},
      {ownerName: "Alice", units: "1, 2", charged: "90.00", paid: "40.00", debt: "50.00"},
    ]);
  });

  it("matches the sum of unitDebt over each owner's units", () => {
    const report = computeDebtByOwner(unitRows, paidByPeriod, paidByOwner, cfg, now);
    const periods = buildPeriods(cfg.billingStart, now);
    const fee = (area: string) => Number(area) * cfg.tariffPerSqm;
    const getPaid = (unitId: string) => (p: BillingPeriod) => paidByPeriod.get(unitId)?.get(`${p.year}-${p.month}`) ?? 0;

    for (const [ownerId, ownerName] of [["o1", "Alice"], ["o2", "Bob"]] as const) {
      const expectedDebt = unitRows
        .filter((r) => r.ownerId === ownerId)
        .reduce((sum, r) => sum + unitDebt(fee(r.area), periods, getPaid(r.unitId)), 0);
      expect(report.find((r) => r.ownerName === ownerName)?.debt).toBe(formatMoney(moneyToCents(expectedDebt)));
    }
  });

  it("clamps per period: overpayment in one period never offsets another", () => {
    const rows = [{ownerId: "o1", ownerName: "Alice", unitId: "u1", unitNumber: "1", area: "50"}];
    const overpaid = new Map([["u1", new Map([["2025-1", 40]])]]); // paid 40 against a 20 fee in Jan
    const report = computeDebtByOwner(rows, overpaid, new Map([["o1", 40]]), cfg, new Date(2025, 1, 28)); // Jan–Feb

    // The old charged−paid definition would report 0; canonical keeps February's debt.
    expect(report).toEqual([
      {ownerName: "Alice", units: "1", charged: "40.00", paid: "40.00", debt: "20.00"},
    ]);
  });
});

describe("moneyToCents", () => {
  it("converts decimal strings to whole cents", () => {
    expect(moneyToCents("25.50")).toBe(2550);
    expect(moneyToCents("0.10")).toBe(10);
    expect(moneyToCents("100.00")).toBe(10000);
    expect(moneyToCents(0.1)).toBe(10);
  });

  it("throws on NaN or non-finite input", () => {
    expect(() => moneyToCents("abc")).toThrow("Invalid monetary amount");
    expect(() => moneyToCents(Number.NaN)).toThrow("Invalid monetary amount");
    expect(() => moneyToCents("Infinity")).toThrow("Invalid monetary amount");
  });

  it("passes negative amounts through as negative cents", () => {
    expect(moneyToCents("-5.00")).toBe(-500);
    expect(moneyToCents(-0.5)).toBe(-50);
  });
});
