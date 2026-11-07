"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {hasStaffRole} from "@/core/auth/permissions";
import {TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES} from "@/core/db/schema/enums";
import {DomainError, ForbiddenError} from "@/core/errors/app-error";
import {uuidSchema} from "@/core/validation/action-schemas";
import {
  addComment,
  createTicket,
  deleteTicket,
  getTicketById,
  updateTicketStatus,
  userOwnsUnit,
} from "./ticket.service";

const ticketCreateSchema = z.object({
  unitId: uuidSchema.nullable().optional(),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(20000),
});

const ticketIdSchema = z.object({id: uuidSchema});

const ticketStatusSchema = z.object({
  id: uuidSchema,
  status: z.enum(TICKET_STATUSES),
  rejectionReason: z.string().trim().max(2000).optional(),
});

const rejectSchema = z.object({
  id: uuidSchema,
  rejectionReason: z.string().trim().min(1).max(2000),
});

const commentSchema = z.object({
  ticketId: uuidSchema,
  content: z.string().trim().min(1).max(10000),
  isInternal: z.boolean().default(false),
});

export async function createTicketAction(input: z.input<typeof ticketCreateSchema>) {
  return runAction({
    permission: "ticket:write",
    schema: ticketCreateSchema,
    errors: "errors",
    revalidate: ["/tickets"],
    handler: async ({session, tenantId}, data) => {
      if (data.unitId && !hasStaffRole(session.user.roles)
        && !(await userOwnsUnit(tenantId, session.user.id, data.unitId))) {
        throw new ForbiddenError();
      }
      await createTicket(tenantId, session.user.id, data);
      return {success: true};
    },
  }, input);
}

export async function changeTicketStatusAction(
  id: string,
  newStatus: (typeof TICKET_STATUSES)[number],
  rejectionReason?: string,
) {
  return runAction({
    permission: "ticket:write",
    schema: ticketStatusSchema,
    errors: "errors",
    revalidate: (data) => ["/tickets", `/tickets/${data.id}`],
    handler: async ({session, tenantId}, data) => {
      if (!hasStaffRole(session.user.roles)) throw new ForbiddenError();
      await updateTicketStatus(tenantId, data.id, data.status, session.user.id, data.rejectionReason);
      return {success: true};
    },
  }, {id, status: newStatus, rejectionReason});
}

export async function rejectTicketAction(id: string, rejectionReason: string) {
  return runAction({
    permission: "ticket:write",
    schema: rejectSchema,
    errors: "errors",
    revalidate: (data) => ["/tickets", `/tickets/${data.id}`],
    handler: async ({session, tenantId}, data) => {
      if (!hasStaffRole(session.user.roles)) throw new ForbiddenError();
      await updateTicketStatus(tenantId, data.id, "rejected", session.user.id, data.rejectionReason);
      return {success: true};
    },
  }, {id, rejectionReason});
}

export async function deleteTicketAction(id: string) {
  return runAction({
    permission: "ticket:write",
    schema: ticketIdSchema,
    errors: "errors",
    revalidate: ["/tickets"],
    handler: async ({session, tenantId}, data) => {
      if (!hasStaffRole(session.user.roles)) {
        const ticket = await getTicketById(tenantId, data.id);
        if (!ticket || ticket.createdBy !== session.user.id) {
          throw new ForbiddenError();
        }
      }
      await deleteTicket(tenantId, data.id, session.user.id);
      return {success: true};
    },
  }, {id});
}

export async function addCommentAction(ticketId: string, content: string, isInternal = false) {
  return runAction({
    permission: "ticket:read",
    schema: commentSchema,
    errors: "errors",
    revalidate: [`/tickets/${ticketId}`],
    handler: async ({session, tenantId}, data) => {
      const ticket = await getTicketById(tenantId, data.ticketId);
      if (!ticket) throw new DomainError("ticketNotFound");
      const staff = hasStaffRole(session.user.roles);
      if (!staff && ticket.createdBy !== session.user.id) throw new ForbiddenError();
      if (data.isInternal && !staff) throw new ForbiddenError();
      await addComment(tenantId, data.ticketId, session.user.id, data.content, data.isInternal);
      return {success: true};
    },
  }, {ticketId, content, isInternal});
}
