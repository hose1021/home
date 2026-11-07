import {getTranslations} from "next-intl/server";
import {sessionAllows} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {listAnnouncements} from "@/modules/announcements/announcement.service";
import {AnnouncementCreateButton} from "@/modules/announcements/components/AnnouncementCreateButton";
import {AnnouncementBoard} from "./announcement-board";

export default async function AnnouncementsPage() {
  const {session, tenantId} = await requireTenantPermission("announcement:read");
  const t = await getTranslations("announcements");

  const announcements = await listAnnouncements(tenantId);

  const canManage = sessionAllows(session, "announcement:write");

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("infoCenter")}</p>
          <h1 className="page-heading mt-1">{t("title")}</h1>
          <p className="page-description">{t("description")}</p>
        </div>
        {canManage && <AnnouncementCreateButton />}
      </div>
      <AnnouncementBoard
        announcements={announcements}
        canManage={canManage}
      />
    </div>
  );
}
