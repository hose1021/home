import {hasStaffRole, sessionAllows} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {TicketList} from "@/modules/tickets/components/TicketList";
import {listSelectableUnits, listTicketsWithDetails} from "@/modules/tickets/ticket.service";

export default async function TicketsPage() {
  const {session, tenantId} = await requireTenantPermission("ticket:read");
  const isStaff = hasStaffRole(session.user.roles);

  const [tickets, units] = await Promise.all([
    listTicketsWithDetails(tenantId, isStaff ? undefined : {createdBy: session.user.id}),
    listSelectableUnits(tenantId, {isStaff, userId: session.user.id}),
  ]);

  return (
    <TicketList
      tickets={tickets}
      canCreate={sessionAllows(session, "ticket:write")}
      units={units}
    />
  );
}
