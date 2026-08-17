import {describe, expect, it} from "vitest";
import {assertBudgetEditable} from "./budget.service";

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
