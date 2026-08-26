import {describe, expect, it} from "vitest";
import {budgetItemUpdateSchema} from "@/core/validation/action-schemas";
import {assertBudgetEditable, planFieldsChanged} from "./budget.service";

describe("assertBudgetEditable", () => {
  it("allows mutable budget states", () => {
    expect(() => assertBudgetEditable("draft")).not.toThrow();
    expect(() => assertBudgetEditable("pending_approval")).not.toThrow();
    expect(() => assertBudgetEditable("rejected")).not.toThrow();
  });

  it("blocks approved budget mutations", () => {
    expect(() => assertBudgetEditable("approved")).toThrow("Утверждённый бюджет нельзя изменять");
  });
});

describe("budgetItemUpdateSchema", () => {
  it("accepts a valid actual amount", () => {
    expect(budgetItemUpdateSchema.parse({ actualAmount: "12.50" }).actualAmount).toBe("12.50");
    expect(budgetItemUpdateSchema.parse({ actualAmount: "0" }).actualAmount).toBe("0");
  });

  it("rejects negative or malformed actual amounts", () => {
    expect(() => budgetItemUpdateSchema.parse({ actualAmount: "-5" })).toThrow();
    expect(() => budgetItemUpdateSchema.parse({ actualAmount: "1.234" })).toThrow();
    expect(() => budgetItemUpdateSchema.parse({ actualAmount: "abc" })).toThrow();
  });

  it("keeps planned amount and notes mutable without touching the fact", () => {
    const parsed = budgetItemUpdateSchema.parse({ plannedAmount: "100.00", notes: "n" });
    expect(parsed.actualAmount).toBeUndefined();
  });
});

describe("planFieldsChanged", () => {
  const persisted = { plannedAmount: "1000.00", notes: "note" };

  it("ignores amount formatting differences", () => {
    expect(planFieldsChanged({ plannedAmount: "1000" }, persisted)).toBe(false);
    expect(planFieldsChanged({ plannedAmount: "1000.00" }, persisted)).toBe(false);
  });

  it("detects a real plan change", () => {
    expect(planFieldsChanged({ plannedAmount: "1001.00" }, persisted)).toBe(true);
    expect(planFieldsChanged({ notes: "changed" }, persisted)).toBe(true);
  });

  it("ignores untouched fields", () => {
    expect(planFieldsChanged({}, persisted)).toBe(false);
    expect(planFieldsChanged({ notes: "note" }, persisted)).toBe(false);
  });
});
