import type {TicketStatus} from "@/core/db/schema/enums";

export const TICKET_TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  pending: ["in_progress", "rejected", "done"],
  in_progress: ["pending", "rejected", "done"],
  rejected: ["pending"],
  done: ["pending"],
};

/** Status colours for one ticket: the list badge and the detail action button. */
export const TICKET_TONE: Readonly<Record<TicketStatus, {badge: string; action: string}>> = {
  pending: {
    badge: "bg-primary/12 border-primary/35 text-primary",
    action: "border-border hover:border-primary/45 hover:bg-primary/10 hover:text-primary",
  },
  in_progress: {
    badge: "bg-gold/12 border-gold/35 text-gold",
    action: "border-border hover:border-gold/45 hover:bg-gold/10 hover:text-gold",
  },
  rejected: {
    badge: "bg-danger/12 border-danger/35 text-danger",
    action: "border-border hover:border-danger/45 hover:bg-danger/10 hover:text-danger",
  },
  done: {
    badge: "bg-success/12 border-success/35 text-success",
    action: "border-border hover:border-success/45 hover:bg-success/10 hover:text-success",
  },
};

export function isValidTicketTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TICKET_TRANSITIONS[from]?.includes(to) ?? false;
}
