import {db} from "@/core/db";
import {tickets} from "@/core/db/schema/tickets";
import {units} from "@/core/db/schema/units";
import {owners, ownerships} from "@/core/db/schema/owners";
import {users} from "@/core/db/schema/users";
import {and, eq, inArray} from "drizzle-orm";
import {requireTenantPermission} from "@/core/auth/session";
import {getPermissionsForRoles, hasStaffRole, type Permission} from "@/core/auth/permissions";
import {TicketList, type TicketListItem} from "@/modules/tickets/components/TicketList";
import {getAllUnits, getUnitsForUser} from "@/modules/tickets/ticket.service";

export default async function TicketsPage() {
  const { session, tenantId } = await requireTenantPermission("ticket:read");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);
  const isStaff = hasStaffRole(session.user.roles);

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
      createdBy: tickets.createdBy,
    })
    .from(tickets)
    .leftJoin(units, eq(units.id, tickets.unitId))
    .where(and(
      eq(tickets.tenantId, tenantId),
      isStaff ? undefined : eq(tickets.createdBy, session.user.id),
    ))
    .orderBy(tickets.createdAt);

  const unitIds = [...new Set(rows.map((r) => r.unitId).filter(Boolean))] as string[];
  const creatorIds = [...new Set(rows.map((r) => r.createdBy))];

  const [ownerRows, creatorRows] = await Promise.all([
    unitIds.length > 0
      ? db
          .select({
            unitId: ownerships.unitId,
            ownerName: owners.fullName,
            ownerPhone: users.phone,
          })
          .from(ownerships)
          .innerJoin(owners, eq(owners.id, ownerships.ownerId))
          .leftJoin(users, eq(users.id, owners.userId))
          .where(and(eq(ownerships.isPrimary, true), inArray(ownerships.unitId, unitIds)))
      : Promise.resolve([]),
    creatorIds.length > 0
      ? db
          .select({ id: users.id, fullName: users.fullName })
          .from(users)
          .where(inArray(users.id, creatorIds))
      : Promise.resolve([]),
  ]);

  const ownerByUnit = new Map(ownerRows.map((o) => [o.unitId, o]));
  const creatorMap = new Map(creatorRows.map((u) => [u.id, u.fullName]));

  const ticketList: TicketListItem[] = rows.map((r) => {
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
      createdBy: creatorMap.get(r.createdBy) ?? "—",
    };
  });

  let unitList: { id: string; unitNumber: string; entrance: number; floor: number; ownerName: string | null }[] = [];
  if (session) {
    if (isStaff) {
      unitList = await getAllUnits(tenantId);
    } else {
      const ownerRow = await db
        .select({ id: owners.id })
        .from(owners)
        .where(eq(owners.userId, session.user.id))
        .limit(1);
      if (ownerRow.length > 0) {
        const myUnits = await getUnitsForUser(tenantId, ownerRow[0].id);
        unitList = myUnits.map((u) => ({ ...u, ownerName: null }));
      }
    }
  }

  return (
      <TicketList
        tickets={ticketList}
        canCreate={permissions.includes("ticket:write")}
        units={unitList}
      />
  );
}
