import {describe, expect, it} from "vitest";
import {buildPaidByUnit} from "./owner.service";

describe("buildPaidByUnit", () => {
  it("groups confirmed payments per unit per period keyed by YYYY-M", () => {
    const map = buildPaidByUnit([
      {unitId: "u1", periodYear: 2026, periodMonth: 1, paid: "36.24"},
      {unitId: "u1", periodYear: 2026, periodMonth: 2, paid: "36.24"},
      {unitId: "u2", periodYear: 2026, periodMonth: 1, paid: "40.00"},
    ]);
    expect(map.get("u1")?.get("2026-1")).toBe(36.24);
    expect(map.get("u1")?.get("2026-2")).toBe(36.24);
    expect(map.get("u2")?.get("2026-1")).toBe(40);
  });

  it("coalesces multiple payments in one period into a single key", () => {
    const map = buildPaidByUnit([
      {unitId: "u1", periodYear: 2026, periodMonth: 1, paid: "20.00"},
      {unitId: "u1", periodYear: 2026, periodMonth: 1, paid: "16.24"},
    ]);
    expect(map.get("u1")?.get("2026-1")).toBe(16.24); // last row wins — SQL sum happens before this helper
  });

  it("returns empty map for no rows", () => {
    expect(buildPaidByUnit([]).size).toBe(0);
  });
});
