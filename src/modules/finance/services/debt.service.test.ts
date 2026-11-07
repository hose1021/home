import {describe, expect, it} from "vitest";
import {periodKey} from "@/modules/finance/period";
import {buildPeriods} from "./debt.service";

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
    const keys = periods.map((p) => periodKey(p.year, p.month));
    expect(keys).toEqual([
      "2024-11", "2024-12",
      ...Array.from({length: 12}, (_, i) => periodKey(2025, i + 1)),
      "2026-01",
    ]);
  });

  it("falls back to now's January when billingStart is malformed", () => {
    const periods = buildPeriods("garbage", new Date(2026, 0, 31));
    expect(periods).toEqual([{year: 2026, month: 1}]);
  });
});
