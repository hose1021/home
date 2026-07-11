"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {hasStaffRole} from "@/core/auth/permissions";
import {ForbiddenError} from "@/core/errors/app-error";
import {
    addComment,
    assignTicket,
    createTicket,
    deleteTicket,
    getTicketById,
    type TicketCategory,
    type TicketPriority,
    type TicketStatus,
    updateTicket,
    updateTicketStatus,
    userOwnsUnit,
} from "./ticket.service";

export async function createTicketAction(input: {
  unitId?: string | null;
  category: TicketCategory;
  priority?: TicketPriority;
  title: string;
  description: string;
}) {
  const { session, tenantId } = await requireTenantPermission("ticket:write");
  if (!hasStaffRole(session.user.roles) && input.unitId) {
    const ownsUnit = await userOwnsUnit(tenantId, session.user.id, input.unitId);
    if (!ownsUnit) throw new ForbiddenError("A ticket can only be created for your own unit");
  }
  await createTicket(tenantId, session.user.id, input);
  revalidatePath("/tickets");
  return { success: true };
}

export async function updateTicketAction(id: string, input: {
  title?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
}) {
  const { session, tenantId } = await requireTenantPermission("ticket:write");
  requireTicketStaff(session.user.roles);
  await updateTicket(tenantId, id, input, session.user.id);
  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  return { success: true };
}

export async function changeTicketStatusAction(id: string, newStatus: TicketStatus, rejectionReason?: string) {
  const { session, tenantId } = await requireTenantPermission("ticket:write");
  requireTicketStaff(session.user.roles);
  await updateTicketStatus(tenantId, id, newStatus, session.user.id, rejectionReason);
  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  return { success: true };
}

export async function rejectTicketAction(id: string, rejectionReason: string) {
  const { session, tenantId } = await requireTenantPermission("ticket:write");
  requireTicketStaff(session.user.roles);
  await updateTicketStatus(tenantId, id, "rejected", session.user.id, rejectionReason);
  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  return { success: true };
}

export async function assignTicketAction(id: string, assignedTo: string) {
  const { session, tenantId } = await requireTenantPermission("ticket:write");
  requireTicketStaff(session.user.roles);
  await assignTicket(tenantId, id, assignedTo, session.user.id);
  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  return { success: true };
}

export async function deleteTicketAction(id: string) {
  const { session, tenantId } = await requireTenantPermission("ticket:write");
  if (!hasStaffRole(session.user.roles)) {
    const ticket = await getTicketById(tenantId, id);
    if (!ticket || ticket.createdBy !== session.user.id) {
      throw new ForbiddenError("Only staff or the ticket creator can delete it");
    }
  }
  await deleteTicket(tenantId, id, session.user.id);
  revalidatePath("/tickets");
  return { success: true };
}

export async function addCommentAction(ticketId: string, content: string, isInternal = false) {
  const { session, tenantId } = await requireTenantPermission("ticket:read");
  const ticket = await getTicketById(tenantId, ticketId);
  if (!ticket) throw new Error("Ticket not found");
  const staff = hasStaffRole(session.user.roles);
  if (!staff && ticket.createdBy !== session.user.id) {
    throw new ForbiddenError("You cannot comment on this ticket");
  }
  if (isInternal && !staff) {
    throw new ForbiddenError("Only staff can create internal comments");
  }
  await addComment(tenantId, ticketId, session.user.id, content, isInternal);
  revalidatePath(`/tickets/${ticketId}`);
  return { success: true };
}

function requireTicketStaff(roles: Parameters<typeof hasStaffRole>[0]): void {
  if (!hasStaffRole(roles)) {
    throw new ForbiddenError("Only staff can manage tickets");
  }
}
