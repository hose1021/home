import {and, desc, eq, inArray} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import type {TicketCategory, TicketPriority, TicketStatus} from "@/core/db/schema/enums";
import {owners, ownerships} from "@/core/db/schema/owners";
import {ticketComments, tickets} from "@/core/db/schema/tickets";
import {units} from "@/core/db/schema/units";
import {users} from "@/core/db/schema/users";
import {DomainError} from "@/core/errors/app-error";
import {isValidTicketTransition} from "./ticket.constants";

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
    if (!unit) throw new DomainError("unitNotFound");
  }

  const priority = input.priority ?? "medium";
  const [ticket] = await db.insert(tickets).values({
    tenantId,
    unitId: input.unitId ?? null,
    createdBy: userId,
    category: input.category,
    priority,
    status: "pending",
    title: input.title,
    description: input.description,
  }).returning();
  if (!ticket) throw new DomainError("ticketNotFound");

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "ticket",
    entityId: ticket.id,
    newValues: {title: input.title, category: input.category, priority},
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

export async function listTicketsWithDetails(tenantId: string, filter?: {
  status?: TicketStatus;
  category?: TicketCategory;
  createdBy?: string;
}) {
  const conditions = [eq(tickets.tenantId, tenantId)];
  if (filter?.status) conditions.push(eq(tickets.status, filter.status));
  if (filter?.category) conditions.push(eq(tickets.category, filter.category));
  if (filter?.createdBy) conditions.push(eq(tickets.createdBy, filter.createdBy));

  const rows = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      category: tickets.category,
      priority: tickets.priority,
      status: tickets.status,
      rejectionReason: tickets.rejectionReason,
      createdAt: tickets.createdAt,
      unitId: tickets.unitId,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
    })
    .from(tickets)
    .leftJoin(units, and(eq(units.id, tickets.unitId), eq(units.tenantId, tenantId)))
    .where(and(...conditions))
    .orderBy(desc(tickets.createdAt))
    .limit(500);

  const unitIds = [...new Set(rows.map((r) => r.unitId).filter((id): id is string => Boolean(id)))];

  const ownerRows = unitIds.length > 0
    ? await db
        .select({
          unitId: ownerships.unitId,
          ownerName: owners.fullName,
          ownerPhone: users.phone,
        })
        .from(ownerships)
        .innerJoin(owners, eq(owners.id, ownerships.ownerId))
        .leftJoin(users, eq(users.id, owners.userId))
        .where(and(eq(ownerships.tenantId, tenantId), eq(ownerships.isPrimary, true), inArray(ownerships.unitId, unitIds)))
    : [];

  const ownerByUnit = new Map(ownerRows.map((o) => [o.unitId, o]));

  return rows.map((r) => {
    const owner = r.unitId ? ownerByUnit.get(r.unitId) : null;
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      priority: r.priority,
      status: r.status,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt,
      unitNumber: r.unitNumber,
      entrance: r.entrance,
      floor: r.floor,
      ownerName: owner?.ownerName ?? null,
      ownerPhone: owner?.ownerPhone ?? null,
    };
  });
}

export async function getTicketDetail(tenantId: string, ticketId: string, filter?: {createdBy?: string}) {
  const [ticket] = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      description: tickets.description,
      category: tickets.category,
      priority: tickets.priority,
      status: tickets.status,
      rejectionReason: tickets.rejectionReason,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      createdById: tickets.createdBy,
      assignedTo: tickets.assignedTo,
      unitId: tickets.unitId,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
    })
    .from(tickets)
    .leftJoin(units, and(eq(units.id, tickets.unitId), eq(units.tenantId, tenantId)))
    .where(and(
      eq(tickets.id, ticketId),
      eq(tickets.tenantId, tenantId),
      filter?.createdBy ? eq(tickets.createdBy, filter.createdBy) : undefined,
    ))
    .limit(1);

  if (!ticket) return null;

  const [creatorRow, ownerRow, assignedRow] = await Promise.all([
    db.select({fullName: users.fullName}).from(users).where(eq(users.id, ticket.createdById)).limit(1),
    ticket.unitId
      ? db
          .select({ownerName: owners.fullName, ownerPhone: users.phone})
          .from(ownerships)
          .innerJoin(owners, eq(owners.id, ownerships.ownerId))
          .leftJoin(users, eq(users.id, owners.userId))
          .where(and(eq(ownerships.unitId, ticket.unitId), eq(ownerships.isPrimary, true)))
          .limit(1)
      : Promise.resolve([]),
    ticket.assignedTo
      ? db.select({fullName: users.fullName}).from(users).where(eq(users.id, ticket.assignedTo)).limit(1)
      : Promise.resolve([]),
  ]);

  return {
    ...ticket,
    createdByName: creatorRow[0]?.fullName ?? null,
    assignedToName: assignedRow[0]?.fullName ?? null,
    ownerName: ownerRow[0]?.ownerName ?? null,
    ownerPhone: ownerRow[0]?.ownerPhone ?? null,
  };
}

export async function updateTicketStatus(
  tenantId: string,
  id: string,
  newStatus: TicketStatus,
  userId: string,
  rejectionReason?: string,
) {
  const ticket = await getTicketById(tenantId, id);
  if (!ticket) throw new DomainError("ticketNotFound");

  const currentStatus = ticket.status as TicketStatus;
  if (currentStatus === newStatus) return ticket;

  if (!isValidTicketTransition(currentStatus, newStatus)) {
    throw new DomainError("invalidTransition");
  }

  if (newStatus === "rejected" && !rejectionReason?.trim()) {
    throw new DomainError("rejectionReasonRequired");
  }

  const [updated] = await db
    .update(tickets)
    .set({
      status: newStatus,
      rejectionReason: newStatus === "rejected" ? rejectionReason : null,
      updatedAt: new Date(),
    })
    .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
    .returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "ticket",
    entityId: id,
    oldValues: {status: currentStatus} as Record<string, unknown>,
    newValues: {status: newStatus, rejectionReason: rejectionReason ?? null} as Record<string, unknown>,
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
    oldValues: {title: ticket.title} as Record<string, unknown>,
  });
}

export async function listComments(tenantId: string, ticketId: string, includeInternal = false) {
  const ticket = await getTicketById(tenantId, ticketId);
  if (!ticket) return [];

  const conditions = [eq(ticketComments.ticketId, ticketId)];
  if (!includeInternal) {
    conditions.push(eq(ticketComments.isInternal, false));
  }

  const rows = await db
    .select()
    .from(ticketComments)
    .where(and(...conditions))
    .orderBy(ticketComments.createdAt);

  if (rows.length === 0) return [];

  const authorRows = await db
    .select({id: users.id, fullName: users.fullName})
    .from(users)
    .where(inArray(users.id, [...new Set(rows.map((c) => c.userId))]));
  const authorByUser = new Map(authorRows.map((u) => [u.id, u.fullName]));

  return rows.map((c) => ({...c, authorName: authorByUser.get(c.userId) ?? null}));
}

export async function addComment(
  tenantId: string,
  ticketId: string,
  userId: string,
  content: string,
  isInternal = false,
) {
  const ticket = await getTicketById(tenantId, ticketId);
  if (!ticket) throw new DomainError("ticketNotFound");
  if (!content.trim()) throw new DomainError("commentRequired");

  const [comment] = await db.insert(ticketComments).values({
    ticketId,
    userId,
    content,
    isInternal,
  }).returning();
  if (!comment) throw new DomainError("ticketNotFound");

  await db
    .update(tickets)
    .set({updatedAt: new Date()})
    .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)));

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "ticket_comment",
    entityId: comment.id,
    newValues: {ticketId, isInternal},
  });

  return comment;
}

export async function listSelectableUnits(tenantId: string, viewer: {isStaff: boolean; userId: string}) {
  if (viewer.isStaff) return await listUnits(tenantId);

  const [owner] = await db
    .select({id: owners.id})
    .from(owners)
    .where(and(eq(owners.tenantId, tenantId), eq(owners.userId, viewer.userId)))
    .limit(1);
  if (!owner) return [];

  const rows = await db
    .select({
      id: units.id,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
    })
    .from(ownerships)
    .innerJoin(units, eq(units.id, ownerships.unitId))
    .where(and(eq(ownerships.tenantId, tenantId), eq(ownerships.ownerId, owner.id)))
    .orderBy(units.entrance, units.floor, units.unitNumber);
  return rows.map((unit) => ({...unit, ownerName: null}));
}

async function listUnits(tenantId: string) {
  return await db
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
