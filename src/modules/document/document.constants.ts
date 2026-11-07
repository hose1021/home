/** Client-safe document module constants (no server imports). */
export {DOCUMENT_CATEGORIES, type DocumentCategory} from "@/core/db/schema/enums";

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

/** One whitelist drives the server check, the file input `accept` list and the error message. */
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
] as const;

export const ALLOWED_MIME_SET: ReadonlySet<string> = new Set(ALLOWED_MIME_TYPES);

export const ACCEPTED_FILE_EXTENSIONS = [
  ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx", ".xls", ".xlsx", ".odt", ".ods",
] as const;
