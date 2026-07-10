import {ensureTenantExists} from "@/core/multi-tenant";
import {db} from "@/core/db";
import {meetingAgendas, meetings} from "@/core/db/schema/meetings";
import {eq, inArray} from "drizzle-orm";
import {MeetingTable} from "./meeting-table";
import {getSession} from "@/core/auth/session";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenantId = await ensureTenantExists(tenantSlug);
  const session = await getSession();
  const permissions: Permission[] = session
    ? getPermissionsForRoles(session.user.roles)
    : [];

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Собрания</h1>
          <p className="text-sm text-zinc-500">{meetingData.length} шт.</p>
        </div>
      </div>
      <MeetingTable slug={tenantSlug} meetings={meetingData} canManage={permissions.includes("meeting:write")} />
    </div>
  );
}
