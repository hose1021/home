import {getTranslations} from "next-intl/server";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {listNotifications, listRecipientUsers} from "@/modules/notification/notification.service";
import {NotificationsBoard} from "./notifications-board";

export default async function NotificationsPage() {
  const { session, tenantId } = await requireTenantPermission("owner:read");
  const t = await getTranslations("notifications");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);
  const canSend = permissions.includes("notification:send");
  const notifications = await listNotifications(tenantId, session.user.id);
  const users = canSend ? await listRecipientUsers(tenantId) : [];

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="page-heading mt-1">{t("title")}</h1>
          <p className="page-description">{t("description")}</p>
        </div>
      </div>
      <NotificationsBoard notifications={notifications} users={users} canSend={canSend} />
    </div>
  );
}
