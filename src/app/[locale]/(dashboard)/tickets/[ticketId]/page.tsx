import {notFound} from "next/navigation";
import {hasStaffRole, sessionAllows} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {TicketDetail} from "@/modules/tickets/components/TicketDetail";
import {getTicketDetail, listComments} from "@/modules/tickets/ticket.service";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; ticketId: string }>;
}) {
  const { ticketId } = await params;
  const { session, tenantId } = await requireTenantPermission("ticket:read");
  const isStaff = hasStaffRole(session.user.roles);

  const ticket = await getTicketDetail(tenantId, ticketId, isStaff ? undefined : {createdBy: session.user.id});
  if (!ticket) notFound();

  const canManage = sessionAllows(session, "ticket:write");
  const isCreator = session.user.id === ticket.createdById;
  const canDelete = canManage || isCreator;

  const comments = await listComments(tenantId, ticketId, canManage && isStaff);

  return (
    <TicketDetail
      ticket={ticket}
      comments={comments}
      canManage={canManage}
      canComment
      canDelete={canDelete}
    />
  );
}
