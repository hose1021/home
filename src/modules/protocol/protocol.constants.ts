import type {ProtocolStatus} from "@/core/db/schema/enums";

/** Badge variant per protocol status, shared by every protocol view. */
export const PROTOCOL_TONE: Readonly<Record<ProtocolStatus, "default" | "secondary" | "outline" | "destructive">> = {
  draft: "secondary",
  signed: "default",
  archived: "destructive",
};
