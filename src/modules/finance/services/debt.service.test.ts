import {describe, expect, it} from "vitest";
import {buildPeriods, unitDebt, type BillingPeriod} from "./debt.service";

describe("buildPeriods", () => {
  it("enumerates from billing start through current month", () => {
    const periods = buildPeriods("2025-01", new Date(2026, 7, 25)); // Aug 2026
    expect(periods[0]).toEqual({year: 2025, month: 1});
    expect(periods.at(-1)).toEqual({year: 2026, month: 8});
    expect(periods).toHaveLength(12 + 8);
  });

  it("starts mid-year when billing start is mid-year", () => {
    const periods = buildPeriods("2026-03", new Date(2026, 2, 15)); // Mar 2026
    expect(periods).toEqual([{year: 2026, month: 3}]);
  });

  it("rolls over year boundaries without gaps or duplicates", () => {
    const periods = buildPeriods("2024-11", new Date(2026, 0, 10)); // Jan 2026
    const keys = periods.map((p) => `${p.year}-${p.month}`);
    expect(keys).toEqual([
      "2024-11", "2024-12",
      ...Array.from({length: 12}, (_, i) => `2025-${i + 1}`),
      "2026-1",
    ]);
  });

  it("falls back to now's January when billingStart is malformed", () => {
    const periods = buildPeriods("garbage", new Date(2026, 0, 31));
    expect(periods).toEqual([{year: 2026, month: 1}]);
  });
});

describe("unitDebt", () => {
  const periods: BillingPeriod[] = [
    {year: 2025, month: 1},
    {year: 2025, month: 2},
    {year: 2025, month: 3},
  ];
  const fee = 36;

  it("sums full fee for unpaid periods", () => {
    expect(unitDebt(fee, periods, () => 0)).toBe(108);
  });

  it("clamps per period: overpayment never offsets another period", () => {
    const paidFor = (p: BillingPeriod) =>
      p.month === 1 ? 72 : p.month === 2 ? 0 : 36; // overpaid Jan, skipped Feb
    expect(unitDebt(fee, periods, paidFor)).toBe(36); // only February owed
  });

  it("counts partial payments as remainder", () => {
    const paidFor = (p: BillingPeriod) => (p.month === 1 ? 20 : fee);
    expect(unitDebt(fee, periods, paidFor)).toBe(16);
  });

  it("returns 0 when every period is covered", () => {
    expect(unitDebt(fee, periods, () => fee)).toBe(0);
  });
});
