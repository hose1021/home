/** Client-safe document module constants (no server imports). */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const DOCUMENT_CATEGORIES = [
  "contract",
  "regulation",
  "protocol",
  "act",
  "invoice",
  "other",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
