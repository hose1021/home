import {and, eq, inArray} from "drizzle-orm";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {getPermissionsForRoles, hasStaffRole, type Permission} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {db} from "@/core/db";
import {owners, ownerships} from "@/core/db/schema/owners";
import {tickets} from "@/core/db/schema/tickets";
import {units} from "@/core/db/schema/units";
import {users} from "@/core/db/schema/users";
import {TicketDetail} from "@/modules/tickets/components/TicketDetail";
import {listComments} from "@/modules/tickets/ticket.service";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; ticketId: string }>;
}) {
  const { ticketId } = await params;
  const t = await getTranslations("tickets");
  const { session, tenantId } = await requireTenantPermission("ticket:read");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);
  const isStaff = hasStaffRole(session.user.roles);

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
    .leftJoin(units, eq(units.id, tickets.unitId))
    .where(and(
      eq(tickets.id, ticketId),
      eq(tickets.tenantId, tenantId),
      isStaff ? undefined : eq(tickets.createdBy, session.user.id),
    ))
    .limit(1);

  if (!ticket) notFound();

  const [creatorRow, ownerRow, assignedRow] = await Promise.all([
    db.select({ fullName: users.fullName }).from(users).where(eq(users.id, ticket.createdById)).limit(1),
    ticket.unitId
      ? db
          .select({ ownerName: owners.fullName, ownerPhone: users.phone })
          .from(ownerships)
          .innerJoin(owners, eq(owners.id, ownerships.ownerId))
          .leftJoin(users, eq(users.id, owners.userId))
          .where(and(eq(ownerships.unitId, ticket.unitId), eq(ownerships.isPrimary, true)))
          .limit(1)
      : Promise.resolve([]),
    ticket.assignedTo
      ? db.select({ fullName: users.fullName }).from(users).where(eq(users.id, ticket.assignedTo)).limit(1)
      : Promise.resolve([]),
  ]);

  const canManage = permissions.includes("work_order:write") || permissions.includes("user:manage");
  const canComment = !!session;
  const isCreator = session?.user.id === ticket.createdById;
  const canDelete = canManage || isCreator || session?.user.roles.includes("admin");

  const commentRows = await listComments(tenantId, ticketId, canManage);

  let comments: {
    id: string;
    userId: string;
    content: string;
    isInternal: boolean | null;
    createdAt: Date;
    authorName: string;
  }[] = [];

  if (commentRows.length > 0) {
    const userIds = [...new Set(commentRows.map((c) => c.userId))];
    const userRows = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(inArray(users.id, userIds));
    const userMap = new Map(userRows.map((u) => [u.id, u.fullName]));

    comments = commentRows.map((c) => ({
      id: c.id,
      userId: c.userId,
      content: c.content,
      isInternal: c.isInternal,
      createdAt: c.createdAt,
      authorName: userMap.get(c.userId) ?? t("unknownUser"),
    }));
  }

  return (
    <TicketDetail
      ticket={{
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        rejectionReason: ticket.rejectionReason,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        createdBy: creatorRow[0]?.fullName ?? "—",
        assignedToName: assignedRow[0]?.fullName ?? null,
        unitNumber: ticket.unitNumber,
        entrance: ticket.entrance,
        floor: ticket.floor,
        ownerName: ownerRow[0]?.ownerName ?? null,
        ownerPhone: ownerRow[0]?.ownerPhone ?? null,
      }}
      comments={comments}
      canManage={canManage}
      canComment={canComment}
      canDelete={canDelete}
    />
  );
}
