import {getTranslations} from "next-intl/server";
import {sessionAllows} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {listMeetings} from "@/modules/meeting/meeting.service";
import {listProtocols} from "@/modules/protocol/protocol.service";
import {ProtocolsBoard} from "./protocols-board";

export default async function ProtocolsPage() {
  const { session, tenantId } = await requireTenantPermission("protocol:read");
  const t = await getTranslations("protocols");
  const canManage = sessionAllows(session, "protocol:write");
  const canSign = sessionAllows(session, "protocol:sign");
  const [protocols, meetings] = await Promise.all([
    listProtocols(tenantId),
    listMeetings(tenantId),
  ]);

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="page-heading mt-1">{t("title")}</h1>
          <p className="page-description">{t("description")}</p>
        </div>
      </div>
      <ProtocolsBoard protocols={protocols} meetings={meetings} canManage={canManage} canSign={canSign} />
    </div>
  );
}
