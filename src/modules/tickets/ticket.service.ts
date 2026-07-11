import {db} from "@/core/db";
import {ticketComments, tickets} from "@/core/db/schema/tickets";
import {units} from "@/core/db/schema/units";
import {owners, ownerships} from "@/core/db/schema/owners";
import {users} from "@/core/db/schema/users";
import {and, desc, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";

export type TicketCategory = "plumbing" | "electrical" | "cleaning" | "structural" | "elevator" | "pest_control" | "yard" | "security" | "other";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "pending" | "in_progress" | "rejected" | "done";

const VALID_STATUSES: TicketStatus[] = ["pending", "in_progress", "rejected", "done"];

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  pending: ["in_progress", "rejected", "done"],
  in_progress: ["pending", "rejected", "done"],
  rejected: ["pending"],
  done: ["pending"],
};

export function isValidTransition(from: TicketStatus, to: TicketStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

type CreateTicketInput = {
  unitId?: string | null;
  category: TicketCategory;
  priority?: TicketPriority;
  title: string;
  description: string;
};

export async function createTicket(tenantId: string, userId: string, input: CreateTicketInput) {
  if (input.unitId) {
    const [unit] = await db
      .select({id: units.id})
      .from(units)
      .where(and(eq(units.id, input.unitId), eq(units.tenantId, tenantId), eq(units.status, "active")))
      .limit(1);
    if (!unit) throw new Error("Unit not found");
  }

  const [ticket] = await db.insert(tickets).values({
    tenantId,
    unitId: input.unitId ?? null,
    createdBy: userId,
    category: input.category,
    priority: input.priority ?? "medium",
    status: "pending",
    title: input.title,
    description: input.description,
  }).returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "ticket",
    entityId: ticket.id,
    newValues: { title: input.title, category: input.category, priority: input.priority ?? "medium" },
  });

  return ticket;
}

export async function getTicketById(tenantId: string, id: string) {
  const [t] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
    .limit(1);
  return t ?? null;
}

export async function listTickets(tenantId: string, filter?: {
  status?: TicketStatus;
  category?: TicketCategory;
  createdBy?: string;
}) {
  const conditions = [eq(tickets.tenantId, tenantId)];
  if (filter?.status) conditions.push(eq(tickets.status, filter.status));
  if (filter?.category) conditions.push(eq(tickets.category, filter.category));
  if (filter?.createdBy) conditions.push(eq(tickets.createdBy, filter.createdBy));

  return await db
    .select()
    .from(tickets)
    .where(and(...conditions))
    .orderBy(desc(tickets.createdAt));
}

export async function listTicketsWithDetails(tenantId: string, filter?: {
  status?: TicketStatus;
  category?: TicketCategory;
}) {
  const conditions = [eq(tickets.tenantId, tenantId)];
  if (filter?.status) conditions.push(eq(tickets.status, filter.status));
  if (filter?.category) conditions.push(eq(tickets.category, filter.category));

  return await db
    .select({
      id: tickets.id,
      title: tickets.title,
      category: tickets.category,
      priority: tickets.priority,
      status: tickets.status,
      rejectionReason: tickets.rejectionReason,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      unitNumber: units.unitNumber,
    })
    .from(tickets)
    .leftJoin(units, eq(units.id, tickets.unitId))
    .where(and(...conditions))
    .orderBy(desc(tickets.createdAt));
}

export async function updateTicketStatus(
  tenantId: string,
  id: string,
  newStatus: TicketStatus,
  userId: string,
  rejectionReason?: string,
) {
  const ticket = await getTicketById(tenantId, id);
  if (!ticket) throw new Error("Ticket not found");

  const currentStatus = ticket.status as TicketStatus;
  if (currentStatus === newStatus) return ticket;

  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(`Invalid status transition: ${currentStatus} → ${newStatus}`);
  }

  if (newStatus === "rejected" && !rejectionReason?.trim()) {
    throw new Error("Rejection reason is required");
  }

  const updateData: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
  if (newStatus === "rejected") {
    updateData.rejectionReason = rejectionReason;
  } else {
    updateData.rejectionReason = null;
  }

  const [updated] = await db
    .update(tickets)
    .set(updateData)
    .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
    .returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "ticket",
    entityId: id,
    oldValues: { status: currentStatus } as Record<string, unknown>,
    newValues: { status: newStatus, rejectionReason: rejectionReason ?? null } as Record<string, unknown>,
  });

  return updated;
}

export async function assignTicket(tenantId: string, id: string, assignedTo: string, userId: string) {
  const ticket = await getTicketById(tenantId, id);
  if (!ticket) throw new Error("Ticket not found");

  const [assignee] = await db
    .select({id: users.id})
    .from(users)
    .where(and(eq(users.id, assignedTo), eq(users.tenantId, tenantId), eq(users.isActive, true)))
    .limit(1);
  if (!assignee) throw new Error("Assignee not found");

  const [updated] = await db
    .update(tickets)
    .set({ assignedTo, updatedAt: new Date() })
    .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
    .returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "ticket",
    entityId: id,
    oldValues: { assignedTo: ticket.assignedTo } as Record<string, unknown>,
    newValues: { assignedTo } as Record<string, unknown>,
  });

  return updated;
}

export async function updateTicket(tenantId: string, id: string, input: {
  title?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
}, userId: string) {
  const ticket = await getTicketById(tenantId, id);
  if (!ticket) throw new Error("Ticket not found");

  const [updated] = await db
    .update(tickets)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
    .returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "ticket",
    entityId: id,
    oldValues: ticket as unknown as Record<string, unknown>,
    newValues: input as unknown as Record<string, unknown>,
  });

  return updated;
}

export async function deleteTicket(tenantId: string, id: string, userId: string) {
  const ticket = await getTicketById(tenantId, id);
  if (!ticket) return;

  await db
    .delete(ticketComments)
    .where(eq(ticketComments.ticketId, id));

  await db
    .delete(tickets)
    .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)));

  await writeAuditLog({
    tenantId,
    userId,
    action: "delete",
    entityType: "ticket",
    entityId: id,
    oldValues: { title: ticket.title } as Record<string, unknown>,
  });
}

export async function listComments(tenantId: string, ticketId: string, includeInternal = false) {
  const ticket = await getTicketById(tenantId, ticketId);
  if (!ticket) return [];

  const conditions = [eq(ticketComments.ticketId, ticketId)];
  if (!includeInternal) {
    conditions.push(eq(ticketComments.isInternal, false));
  }

  return await db
    .select()
    .from(ticketComments)
    .where(and(...conditions))
    .orderBy(ticketComments.createdAt);
}

export async function addComment(
  tenantId: string,
  ticketId: string,
  userId: string,
  content: string,
  isInternal = false,
) {
  const ticket = await getTicketById(tenantId, ticketId);
  if (!ticket) throw new Error("Ticket not found");
  if (!content.trim()) throw new Error("Comment cannot be empty");

  const [comment] = await db.insert(ticketComments).values({
    ticketId,
    userId,
    content,
    isInternal,
  }).returning();

  await db
    .update(tickets)
    .set({ updatedAt: new Date() })
    .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)));

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "ticket_comment",
    entityId: comment.id,
    newValues: { ticketId, isInternal },
  });

  return comment;
}

export async function getUnitsForUser(tenantId: string, ownerId: string) {
  const rows = await db
    .select({
      id: units.id,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
    })
    .from(ownerships)
    .innerJoin(units, eq(units.id, ownerships.unitId))
    .where(and(eq(ownerships.tenantId, tenantId), eq(ownerships.ownerId, ownerId)))
    .orderBy(units.entrance, units.floor, units.unitNumber);
  return rows;
}

export async function userOwnsUnit(tenantId: string, userId: string, unitId: string): Promise<boolean> {
  const [row] = await db
    .select({id: ownerships.id})
    .from(ownerships)
    .innerJoin(owners, and(eq(owners.id, ownerships.ownerId), eq(owners.tenantId, tenantId)))
    .innerJoin(units, and(eq(units.id, ownerships.unitId), eq(units.tenantId, tenantId)))
    .where(and(
      eq(ownerships.tenantId, tenantId),
      eq(owners.userId, userId),
      eq(units.id, unitId),
      eq(units.status, "active"),
    ))
    .limit(1);
  return Boolean(row);
}

export async function getAllUnits(tenantId: string) {
  const rows = await db
    .select({
      id: units.id,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
      ownerName: owners.fullName,
    })
    .from(units)
    .leftJoin(ownerships, and(eq(ownerships.unitId, units.id), eq(ownerships.isPrimary, true)))
    .leftJoin(owners, eq(owners.id, ownerships.ownerId))
    .where(and(eq(units.tenantId, tenantId), eq(units.status, "active")))
    .orderBy(units.entrance, units.floor, units.unitNumber);
  return rows;
}

export { VALID_STATUSES, VALID_TRANSITIONS };
