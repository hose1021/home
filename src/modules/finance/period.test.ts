import {describe, expect, it} from "vitest";
import {isWholeMonth, monthBounds, parsePeriodKey, periodKey} from "./period";

describe("parsePeriodKey", () => {
    it("splits a canonical period key", () => {
        expect(parsePeriodKey("2026-05")).toEqual({year: 2026, month: 5});
    });

    it("rejects a missing, partial or out-of-range key instead of inventing a year", () => {
        expect(parsePeriodKey("")).toBeNull();
        expect(parsePeriodKey("2026")).toBeNull();
        expect(parsePeriodKey("2026-13")).toBeNull();
        expect(parsePeriodKey("2026-00")).toBeNull();
    });
});

describe("monthBounds", () => {
    it("returns the first and last day of the month", () => {
        expect(monthBounds("2026-02")).toEqual({from: "2026-02-01", to: "2026-02-28"});
    });

    it("returns an empty range for an invalid key", () => {
        expect(monthBounds("garbage")).toEqual({from: "", to: ""});
    });
});

describe("isWholeMonth", () => {
    it("accepts exactly one calendar month", () => {
        expect(isWholeMonth("2026-02-01", "2026-02-28")).toBe(true);
    });

    it("rejects a partial or cross-month range", () => {
        expect(isWholeMonth("2026-02-02", "2026-02-28")).toBe(false);
        expect(isWholeMonth("2026-02-01", "2026-03-01")).toBe(false);
    });
});

describe("periodKey", () => {
    it("pads the month", () => {
        expect(periodKey(2026, 5)).toBe("2026-05");
    });
});
