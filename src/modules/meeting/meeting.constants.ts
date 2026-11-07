import type {MeetingFormat, MeetingStatus} from "@/core/db/schema/enums";

/** Badge classes per meeting status, shared by every meeting view. */
export const MEETING_STATUS_TONE: Readonly<Record<MeetingStatus, string>> = {
  planned: "bg-primary/12 border-primary/35 text-primary",
  in_progress: "bg-gold/12 border-gold/35 text-gold",
  completed: "bg-success/12 border-success/35 text-success",
  cancelled: "bg-danger/12 border-danger/35 text-danger",
};

/** The `common` namespace spells the formats, so each value needs its own key name. */
export const MEETING_FORMAT_KEYS: Readonly<Record<MeetingFormat, "formatInPerson" | "formatOnline" | "formatMixed">> = {
  in_person: "formatInPerson",
  online: "formatOnline",
  mixed: "formatMixed",
};
