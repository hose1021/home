/**
 * Every closed value set the database, services, actions and UI share. This module has no
 * imports, so the server and the client can both read the same list.
 */

export const ROLES = ["admin", "commandant", "management_member", "owner"] as const;
export type Role = (typeof ROLES)[number];

export const UNIT_TYPES = ["residential", "commercial", "parking", "storage", "other"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const UNIT_STATUSES = ["active", "deleted"] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const RESIDENT_TYPES = ["owner", "family", "tenant", "guest"] as const;
export type ResidentType = (typeof RESIDENT_TYPES)[number];

export const CONTRACTOR_STATUSES = ["invited", "active", "suspended", "terminated"] as const;
export type ContractorStatus = (typeof CONTRACTOR_STATUSES)[number];

export const TICKET_STATUSES = ["pending", "in_progress", "rejected", "done"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_CATEGORIES = [
  "plumbing", "electrical", "cleaning", "structural", "elevator",
  "pest_control", "yard", "security", "other",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const WORK_ORDER_STATUSES = ["pending", "approved", "in_progress", "completed", "cancelled"] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const MEETING_TYPES = ["annual", "extraordinary", "board", "audit"] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export const MEETING_FORMATS = ["in_person", "online", "mixed"] as const;
export type MeetingFormat = (typeof MEETING_FORMATS)[number];

export const MEETING_STATUSES = ["planned", "in_progress", "completed", "cancelled"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const PROTOCOL_STATUSES = ["draft", "signed", "archived"] as const;
export type ProtocolStatus = (typeof PROTOCOL_STATUSES)[number];

export const ANNOUNCEMENT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export const ANNOUNCEMENT_STATUSES = ["active", "archived"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "e_manat", "pos_terminal", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ["confirmed", "rejected", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CHARGE_STATUSES = ["pending", "paid", "partially_paid", "overdue", "cancelled"] as const;
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];

export const VOTING_STATUSES = ["draft", "active", "paused", "counting", "completed", "cancelled", "archived"] as const;
export type VotingStatus = (typeof VOTING_STATUSES)[number];

export const VOTING_TYPES = ["in_person", "absentee", "mixed"] as const;
export type VotingType = (typeof VOTING_TYPES)[number];

export const NOTIFICATION_TYPES = ["info", "warning", "payment", "meeting", "ticket"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ["push", "sms", "in_app"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const ADJUSTMENT_KINDS = ["credit", "debit"] as const;
export type AdjustmentKind = (typeof ADJUSTMENT_KINDS)[number];

export const DOCUMENT_CATEGORIES = [
  "contract", "regulation", "protocol", "act", "invoice", "other",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const AUDIT_ACTIONS = ["create", "update", "delete"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  "announcement", "commandant", "contractor", "document", "adjustment", "charge",
  "expense", "payment", "management_member", "meeting", "notification", "owner",
  "ownership", "unit", "user", "protocol", "resident", "tenant", "ticket",
  "ticket_comment", "work_order",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const BILLING = {minYear: 2000, maxYear: 2200, minMonth: 1, maxMonth: 12, maxDueDay: 28} as const;
