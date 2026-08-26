import {describe, expect, it} from "vitest";
import {buildSummary, filterUnitsWithOwners} from "./finance-dashboard.service";

describe("filterUnitsWithOwners", () => {
  it("keeps only units whose primary owner resolved", () => {
    const rows = [
      {id: "a", unitNumber: "1", entrance: 1, floor: 1, ownerName: "Alice", ownerId: "o1"},
      {id: "b", unitNumber: "2", entrance: 1, floor: 1, ownerName: null, ownerId: null},
      {id: "c", unitNumber: "3", entrance: 1, floor: 2, ownerName: "Bob", ownerId: "o2"},
    ];
    expect(filterUnitsWithOwners(rows).map((u) => u.id)).toEqual(["a", "c"]);
  });

  it("returns an empty list when no unit has an owner", () => {
    const rows = [{id: "a", unitNumber: "1", entrance: 1, floor: 1, ownerName: null, ownerId: null}];
    expect(filterUnitsWithOwners(rows)).toEqual([]);
  });
});

describe("buildSummary", () => {
  it("maps raw totals, debt and fund count into view-ready summary strings", () => {
    expect(buildSummary({chargeTotal: "1250.00", paymentTotal: "900.50", totalDebt: 349.5, fundCount: 3})).toEqual({
      totalCharged: "1250.00",
      totalPaid: "900.50",
      totalDebt: "349.50",
      fundCount: 3,
    });
  });

  it("falls back to 0 when raw totals are absent", () => {
    expect(buildSummary({chargeTotal: undefined, paymentTotal: undefined, totalDebt: 0, fundCount: 0})).toEqual({
      totalCharged: "0",
      totalPaid: "0",
      totalDebt: "0.00",
      fundCount: 0,
    });
  });
});
