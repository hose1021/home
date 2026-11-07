import {getTranslations} from "next-intl/server";
import {sessionAllows} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {listMeetings} from "@/modules/meeting/meeting.service";
import {MeetingAddButton} from "./meeting-add-button";
import {MeetingTable} from "./meeting-table";

export default async function MeetingsPage() {
  const {session, tenantId} = await requireTenantPermission("meeting:read");
  const t = await getTranslations("meetings");
  const tc = await getTranslations("common");
  const canManage = sessionAllows(session, "meeting:write");

  const meetings = await listMeetings(tenantId);

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("collegialManagement")}</p>
          <h1 className="page-heading mt-1">{t("title")}</h1>
          <p className="page-description">{t("description")} · {meetings.length} {tc("pieces")}</p>
        </div>
        {canManage && <MeetingAddButton />}
      </div>
      <MeetingTable meetings={meetings} canManage={canManage} />
    </div>
  );
}
