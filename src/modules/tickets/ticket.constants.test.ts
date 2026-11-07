import {describe, it, expect} from "vitest";
import {TICKET_STATUSES, type TicketStatus} from "@/core/db/schema/enums";
import {isValidTicketTransition, TICKET_TRANSITIONS} from "./ticket.constants";

describe("isValidTicketTransition", () => {
  it("allows pending → in_progress / rejected / done", () => {
    expect(isValidTicketTransition("pending", "in_progress")).toBe(true);
    expect(isValidTicketTransition("pending", "rejected")).toBe(true);
    expect(isValidTicketTransition("pending", "done")).toBe(true);
  });

  it("allows in_progress → pending / rejected / done", () => {
    expect(isValidTicketTransition("in_progress", "pending")).toBe(true);
    expect(isValidTicketTransition("in_progress", "rejected")).toBe(true);
    expect(isValidTicketTransition("in_progress", "done")).toBe(true);
  });

  it("allows rejected → pending only (reopen)", () => {
    expect(isValidTicketTransition("rejected", "pending")).toBe(true);
    expect(isValidTicketTransition("rejected", "in_progress")).toBe(false);
    expect(isValidTicketTransition("rejected", "done")).toBe(false);
  });

  it("allows done → pending only (reopen)", () => {
    expect(isValidTicketTransition("done", "pending")).toBe(true);
    expect(isValidTicketTransition("done", "in_progress")).toBe(false);
    expect(isValidTicketTransition("done", "rejected")).toBe(false);
  });

  it("blocks self-transitions", () => {
    for (const s of TICKET_STATUSES) {
      expect(isValidTicketTransition(s, s)).toBe(false);
    }
  });

  it("returns false for unknown statuses", () => {
    expect(isValidTicketTransition("unknown" as TicketStatus, "pending")).toBe(false);
    expect(isValidTicketTransition("pending", "unknown" as TicketStatus)).toBe(false);
  });
});

describe("TICKET_TRANSITIONS", () => {
  it("every status has transitions defined", () => {
    for (const s of TICKET_STATUSES) {
      expect(TICKET_TRANSITIONS[s]).toBeDefined();
      expect(TICKET_TRANSITIONS[s].length).toBeGreaterThan(0);
    }
  });

  it("no transition points to itself", () => {
    for (const [from, targets] of Object.entries(TICKET_TRANSITIONS)) {
      for (const to of targets) {
        expect(to).not.toBe(from);
      }
    }
  });

  it("covers exactly the enum statuses", () => {
    expect(Object.keys(TICKET_TRANSITIONS).sort()).toEqual([...TICKET_STATUSES].sort());
  });
});
