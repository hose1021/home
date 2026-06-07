import { and, eq, desc } from "drizzle-orm";
import { db } from "@/core/db";
import { announcements } from "@/core/db/schema/announcements";
import { users } from "@/core/db/schema/users";
import { userRoles } from "@/core/db/schema/users";
import { ensureTenantExists } from "@/core/multi-tenant";
import { getSession } from "@/core/auth/session";
import { AnnouncementBoard } from "./announcement-board";

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
      createdAt: announcements.createdAt,
      createdBy: users.fullName,
    })
    .from(announcements)
    .innerJoin(users, eq(users.id, announcements.createdBy))
    .where(and(eq(announcements.tenantId, tenantId), eq(announcements.status, "active")))
    .orderBy(desc(announcements.isPinned), desc(announcements.createdAt));

  const roles = session?.user?.id
    ? await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, session.user.id))
    : [];
  const canManage = roles.some((r) => ["admin", "management_member", "commandant"].includes(r.role));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Объявления</h1>
      </div>
      <AnnouncementBoard
        slug={tenantSlug}
        announcements={list}
        canManage={canManage}
      />
    </div>
  );
}
