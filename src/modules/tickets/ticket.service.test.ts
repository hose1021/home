import {describe, it, expect} from "vitest";
import {
  isValidTransition,
  VALID_STATUSES,
  VALID_TRANSITIONS,
  type TicketStatus,
} from "./ticket.service";

describe("isValidTransition", () => {
  it("allows pending → in_progress / rejected / done", () => {
    expect(isValidTransition("pending", "in_progress")).toBe(true);
    expect(isValidTransition("pending", "rejected")).toBe(true);
    expect(isValidTransition("pending", "done")).toBe(true);
  });

  it("allows in_progress → pending / rejected / done", () => {
    expect(isValidTransition("in_progress", "pending")).toBe(true);
    expect(isValidTransition("in_progress", "rejected")).toBe(true);
    expect(isValidTransition("in_progress", "done")).toBe(true);
  });

  it("allows rejected → pending only (reopen)", () => {
    expect(isValidTransition("rejected", "pending")).toBe(true);
    expect(isValidTransition("rejected", "in_progress")).toBe(false);
    expect(isValidTransition("rejected", "done")).toBe(false);
  });

  it("allows done → pending only (reopen)", () => {
    expect(isValidTransition("done", "pending")).toBe(true);
    expect(isValidTransition("done", "in_progress")).toBe(false);
    expect(isValidTransition("done", "rejected")).toBe(false);
  });

  it("blocks self-transitions", () => {
    for (const s of VALID_STATUSES) {
      expect(isValidTransition(s, s)).toBe(false);
    }
  });

  it("returns false for unknown statuses", () => {
    expect(isValidTransition("unknown" as TicketStatus, "pending")).toBe(false);
    expect(isValidTransition("pending", "unknown" as TicketStatus)).toBe(false);
  });
});

describe("VALID_TRANSITIONS", () => {
  it("every status has transitions defined", () => {
    for (const s of VALID_STATUSES) {
      expect(VALID_TRANSITIONS[s]).toBeDefined();
      expect(VALID_TRANSITIONS[s].length).toBeGreaterThan(0);
    }
  });

  it("no transition points to itself", () => {
    for (const [from, targets] of Object.entries(VALID_TRANSITIONS)) {
      for (const to of targets) {
        expect(to).not.toBe(from);
      }
    }
  });

  it("has exactly 4 statuses", () => {
    expect(VALID_STATUSES).toEqual(["pending", "in_progress", "rejected", "done"]);
  });
});
