import {and, desc, eq} from "drizzle-orm";
import {db} from "@/core/db";
import {announcements} from "@/core/db/schema/announcements";
import {users} from "@/core/db/schema/users";
import {requireTenantPermission} from "@/core/auth/session";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {can} from "@/core/auth/can";
import {AnnouncementBoard} from "./announcement-board";
import {AnnouncementCreateButton} from "@/modules/announcements/components/AnnouncementCreateButton";

export default async function AnnouncementsPage() {
  const { session, tenantId } = await requireTenantPermission("announcement:read");

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

  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);

  const canManage = can(permissions, "announcement:write");

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Информационный центр</p>
          <h1 className="page-heading mt-1">Объявления</h1>
          <p className="page-description">Новости и важные сообщения для жителей</p>
        </div>
        {canManage && <AnnouncementCreateButton />}
      </div>
      <AnnouncementBoard
        announcements={list}
        canManage={canManage}
      />
    </div>
  );
}
