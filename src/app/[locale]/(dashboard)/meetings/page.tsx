import {db} from "@/core/db";
import {meetingAgendas, meetings} from "@/core/db/schema/meetings";
import {eq, inArray} from "drizzle-orm";
import {MeetingTable} from "./meeting-table";
import {MeetingAddButton} from "./meeting-add-button";
import {requireTenantPermission} from "@/core/auth/session";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {getTranslations} from "next-intl/server";

export default async function MeetingsPage() {
  const { session, tenantId } = await requireTenantPermission("meeting:read");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);
  const t = await getTranslations();
  const canManage = permissions.includes("meeting:write");

  const meetingList = await db
    .select()
    .from(meetings)
    .where(eq(meetings.tenantId, tenantId))
    .orderBy(meetings.proposedDate);

  const meetingIds = meetingList.map((m) => m.id);
  const allAgendas = meetingIds.length > 0
    ? await db
        .select()
        .from(meetingAgendas)
        .where(inArray(meetingAgendas.meetingId, meetingIds))
        .orderBy(meetingAgendas.sortOrder)
    : [];

  const agendasByMeeting = new Map<string, typeof allAgendas>();
  for (const a of allAgendas) {
    const arr = agendasByMeeting.get(a.meetingId) ?? [];
    arr.push(a);
    agendasByMeeting.set(a.meetingId, arr);
  }

  const meetingData = meetingList.map((m) => ({
    ...m,
    agendas: agendasByMeeting.get(m.id) ?? [],
  }));

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("meetings.collegialManagement")}</p>
          <h1 className="page-heading mt-1">{t("meetings.title")}</h1>
          <p className="page-description">{t("meetings.description")} · {meetingData.length} {t("common.pieces")}</p>
        </div>
        {canManage && <MeetingAddButton />}
      </div>
      <MeetingTable meetings={meetingData} canManage={canManage} />
    </div>
  );
}
