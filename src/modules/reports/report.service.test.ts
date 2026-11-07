import {describe, expect, it} from "vitest";
import type {ChargeBalance} from "@/modules/finance/services/debt.service";
import {moneyToCents} from "@/modules/finance/services/money";
import {debtRowsByOwner} from "./report.service";

const balance = (overrides: Partial<ChargeBalance>): ChargeBalance => ({
  id: "charge-1",
  ownerId: "o1",
  ownerName: "Alice",
  unitId: "u1",
  unitNumber: "1",
  dueDate: "2025-01-10",
  status: "pending",
  periodYear: 2025,
  periodMonth: 1,
  amountCents: 2000,
  allocatedCents: 0,
  creditCents: 0,
  debitCents: 0,
  ...overrides,
});

describe("debtRowsByOwner", () => {
  it("aggregates charge balances per owner and sorts by debt", () => {
    const balances = [
      balance({id: "a1", ownerId: "o1", ownerName: "Alice", unitId: "u1", unitNumber: "1", amountCents: 2000, allocatedCents: 2000}),
      balance({id: "a2", ownerId: "o1", ownerName: "Alice", unitId: "u2", unitNumber: "2", amountCents: 7000}),
      balance({id: "b1", ownerId: "o2", ownerName: "Bob", unitId: "u3", unitNumber: "3", amountCents: 12000, allocatedCents: 3000}),
    ];
    const paid = new Map([["o1", 4000], ["o2", 3000]]);

    expect(debtRowsByOwner(balances, paid)).toEqual([
      {ownerName: "Bob", units: "3", charged: "120,00 ₼", paid: "30,00 ₼", debt: "90,00 ₼"},
      {ownerName: "Alice", units: "1, 2", charged: "90,00 ₼", paid: "40,00 ₼", debt: "70,00 ₼"},
    ]);
  });

  it("applies credits and debits to what is charged", () => {
    const rows = debtRowsByOwner(
      [balance({amountCents: 10_000, creditCents: 2_000, debitCents: 500, allocatedCents: 3_000})],
      new Map(),
    );

    expect(rows).toEqual([
      {ownerName: "Alice", units: "1", charged: "85,00 ₼", paid: "0,00 ₼", debt: "55,00 ₼"},
    ]);
  });

  it("never reports negative debt when a charge is overpaid", () => {
    const rows = debtRowsByOwner([balance({amountCents: 2_000, allocatedCents: 5_000})], new Map());
    expect(rows[0]?.debt).toBe("0,00 ₼");
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
