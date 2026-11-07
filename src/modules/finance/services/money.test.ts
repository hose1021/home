import {describe, expect, it} from "vitest";
import {centsToDecimal, centsToMoney, monthlyFeeCents} from "./money";

describe("centsToMoney / centsToDecimal", () => {
    it("turn whole cents into the decimal forms callers use", () => {
        expect(centsToMoney(2500)).toBe(25);
        expect(centsToDecimal(2500)).toBe("25.00");
        expect(centsToDecimal(5)).toBe("0.05");
    });
});

describe("monthlyFeeCents", () => {
    it("computes area × tariff in whole cents", () => {
        expect(monthlyFeeCents("62.5", 0.4)).toBe(2500);
        expect(monthlyFeeCents(50, "0.40")).toBe(2000);
    });

    it("rounds to the nearest cent", () => {
        expect(monthlyFeeCents(0.333, "0.40")).toBe(13);
    });
});
