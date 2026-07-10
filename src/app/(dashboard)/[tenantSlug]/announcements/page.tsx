import {and, desc, eq} from "drizzle-orm";
import {db} from "@/core/db";
import {announcements} from "@/core/db/schema/announcements";
import {users} from "@/core/db/schema/users";
import {ensureTenantExists} from "@/core/multi-tenant";
import {getSession} from "@/core/auth/session";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {can} from "@/core/auth/can";
import {AnnouncementBoard} from "./announcement-board";
import {AnnouncementCreateButton} from "@/modules/announcements/components/AnnouncementCreateButton";

export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenantId = await ensureTenantExists(tenantSlug);
  const session = await getSession();

  const list = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      content: announcements.content,
      priority: announcements.priority,
      isPinned: announcements.isPinned,
      isDashboard: announcements.isDashboard,
      createdAt: announcements.createdAt,
      createdBy: users.fullName,
    })
    .from(announcements)
    .innerJoin(users, eq(users.id, announcements.createdBy))
    .where(and(eq(announcements.tenantId, tenantId), eq(announcements.status, "active")))
    .orderBy(desc(announcements.isDashboard), desc(announcements.isPinned), desc(announcements.createdAt));

  const permissions: Permission[] = session
    ? getPermissionsForRoles(session.user.roles)
    : [];

  const canManage = can(permissions, "announcement:write");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Объявления</h1>
        {canManage && <AnnouncementCreateButton slug={tenantSlug} />}
      </div>
      <AnnouncementBoard
        slug={tenantSlug}
        announcements={list}
        canManage={canManage}
      />
    </div>
  );
}
