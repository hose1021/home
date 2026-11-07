import type {VotingStatus, VotingType} from "@/core/db/schema/enums";

/** The `voting` namespace names in-person voting `inPerson`, so each value needs its key. */
export const VOTING_TYPE_KEYS: Readonly<Record<VotingType, "inPerson" | "absentee" | "mixed">> = {
  in_person: "inPerson",
  absentee: "absentee",
  mixed: "mixed",
};

/** Text tone per voting status, shared by every voting view. */
export const VOTING_STATUS_TONE: Readonly<Record<VotingStatus, string>> = {
  draft: "text-muted-foreground",
  active: "text-primary",
  paused: "text-warning",
  counting: "text-gold",
  completed: "text-success",
  cancelled: "text-danger",
  archived: "text-muted-foreground",
};
