"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission, requireTenantContext} from "@/core/auth/session";
import {hasPermission} from "@/core/auth/permissions";
import {
  createTicket,
  updateTicketStatus,
  assignTicket,
  updateTicket,
  deleteTicket,
  addComment,
  getTicketById,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "./ticket.service";

export async function createTicketAction(slug: string, input: {
  unitId?: string | null;
  category: TicketCategory;
  priority?: TicketPriority;
  title: string;
  description: string;
}) {
  const { session, tenantId } = await requireTenantPermission(slug, "ticket:write");
  await createTicket(tenantId, session.user.id, input);
  revalidatePath(`/${slug}/tickets`);
  return { success: true };
}

export async function updateTicketAction(slug: string, id: string, input: {
  title?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
}) {
  const { session, tenantId } = await requireTenantPermission(slug, "ticket:write");
  await updateTicket(tenantId, id, input, session.user.id);
  revalidatePath(`/${slug}/tickets`);
  revalidatePath(`/${slug}/tickets/${id}`);
  return { success: true };
}

export async function changeTicketStatusAction(slug: string, id: string, newStatus: TicketStatus, rejectionReason?: string) {
  const { session, tenantId } = await requireTenantPermission(slug, "ticket:write");
  await updateTicketStatus(tenantId, id, newStatus, session.user.id, rejectionReason);
  revalidatePath(`/${slug}/tickets`);
  revalidatePath(`/${slug}/tickets/${id}`);
  return { success: true };
}

export async function rejectTicketAction(slug: string, id: string, rejectionReason: string) {
  const { session, tenantId } = await requireTenantPermission(slug, "ticket:write");
  await updateTicketStatus(tenantId, id, "rejected", session.user.id, rejectionReason);
  revalidatePath(`/${slug}/tickets`);
  revalidatePath(`/${slug}/tickets/${id}`);
  return { success: true };
}

export async function assignTicketAction(slug: string, id: string, assignedTo: string) {
  const { session, tenantId } = await requireTenantPermission(slug, "ticket:write");
  await assignTicket(tenantId, id, assignedTo, session.user.id);
  revalidatePath(`/${slug}/tickets`);
  revalidatePath(`/${slug}/tickets/${id}`);
  return { success: true };
}

export async function deleteTicketAction(slug: string, id: string) {
  const { session, tenantId } = await requireTenantContext(slug);
  const isAdmin = session.user.roles.includes("admin");
  const canManage = session.user.roles.some((r) => hasPermission(r, "ticket:write"));
  if (!isAdmin && !canManage) {
    const ticket = await getTicketById(tenantId, id);
    if (!ticket || ticket.createdBy !== session.user.id) {
      throw new Error("Forbidden: only admin or ticket creator can delete");
    }
  }
  await deleteTicket(tenantId, id, session.user.id);
  revalidatePath(`/${slug}/tickets`);
  return { success: true };
}

export async function addCommentAction(slug: string, ticketId: string, content: string, isInternal = false) {
  const { session, tenantId } = await requireTenantContext(slug);
  await addComment(tenantId, ticketId, session.user.id, content, isInternal);
  revalidatePath(`/${slug}/tickets/${ticketId}`);
  return { success: true };
}
