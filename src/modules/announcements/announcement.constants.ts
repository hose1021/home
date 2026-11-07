import type {AnnouncementPriority} from "@/core/db/schema/enums";

/** Accent classes per announcement priority, shared by the board and its badge. */
export const ANNOUNCEMENT_TONE: Readonly<Record<AnnouncementPriority, { border: string; badge: string }>> = {
  low: {border: "border-l-muted-foreground", badge: "bg-muted text-muted-foreground"},
  normal: {border: "border-l-primary", badge: "bg-primary/12 border-primary/35 text-primary"},
  high: {border: "border-l-warning", badge: "bg-warning/12 border-warning/35 text-warning"},
  urgent: {border: "border-l-danger", badge: "bg-danger/12 border-danger/35 text-danger"},
};
