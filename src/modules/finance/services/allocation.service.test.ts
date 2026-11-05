import {describe, expect, it} from "vitest";
import {deriveChargeStatusFromBalance} from "./allocation.service";
import {ageBucket, daysBetween} from "./finance-analytics.service";

const today = new Date("2026-07-20T00:00:00");

function status(input: {
    amountCents?: number;
    creditCents?: number;
    debitCents?: number;
    allocatedCents?: number;
    dueDate?: string | null;
    currentStatus?: string | null;
}) {
    return deriveChargeStatusFromBalance({
        amountCents: input.amountCents ?? 10_000,
        creditCents: input.creditCents ?? 0,
        debitCents: input.debitCents ?? 0,
        allocatedCents: input.allocatedCents ?? 0,
        dueDate: input.dueDate ?? "2026-08-01",
        today,
        currentStatus: input.currentStatus ?? "pending",
    });
}

describe("deriveChargeStatusFromBalance", () => {
    it("keeps cancelled charges cancelled", () => {
        expect(status({currentStatus: "cancelled"})).toBe("cancelled");
    });

    it("marks fully allocated charges paid", () => {
        expect(status({allocatedCents: 10_000})).toBe("paid");
        expect(status({allocatedCents: 12_500})).toBe("paid");
    });

    it("marks partial allocations partially paid", () => {
        expect(status({allocatedCents: 9_999})).toBe("partially_paid");
    });

    it("applies credits and debits to the amount due", () => {
        expect(status({creditCents: 2_000, allocatedCents: 8_000})).toBe("paid");
        expect(status({debitCents: 1_000, allocatedCents: 10_000})).toBe("partially_paid");
    });

    it("marks unpaid past-due charges overdue", () => {
        expect(status({dueDate: "2026-07-01"})).toBe("overdue");
        expect(status({dueDate: "2026-09-01"})).toBe("pending");
    });
});

describe("ageing helpers", () => {
    it("counts days since due date", () => {
        expect(daysBetween("2026-07-20", today)).toBe(0);
        expect(daysBetween("2026-06-20", today)).toBe(30);
    });

    it("maps days overdue to buckets", () => {
        expect(ageBucket(0)).toBe("notDue");
        expect(ageBucket(1)).toBe("days1to30");
        expect(ageBucket(45)).toBe("days31to60");
        expect(ageBucket(75)).toBe("days61to90");
        expect(ageBucket(120)).toBe("over90");
    });
});
