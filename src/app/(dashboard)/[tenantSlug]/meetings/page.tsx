import { ensureTenantExists } from "@/core/multi-tenant";
import { db } from "@/core/db";
import { meetings, meetingAgendas } from "@/core/db/schema/meetings";
import { eq } from "drizzle-orm";
import { MeetingTable } from "./meeting-table";

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenantId = await ensureTenantExists(tenantSlug);

  const meetingList = await db
    .select()
    .from(meetings)
    .where(eq(meetings.tenantId, tenantId))
    .orderBy(meetings.proposedDate);

  const meetingData = await Promise.all(
    meetingList.map(async (m) => {
      const agendas = await db
        .select()
        .from(meetingAgendas)
        .where(eq(meetingAgendas.meetingId, m.id))
        .orderBy(meetingAgendas.sortOrder);
      return { ...m, agendas };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Собрания</h1>
          <p className="text-sm text-zinc-500">{meetingData.length} шт.</p>
        </div>
      </div>
      <MeetingTable slug={tenantSlug} meetings={meetingData} />
    </div>
  );
}
