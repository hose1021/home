import {getTranslations} from "next-intl/server";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {listManagementMembers} from "@/modules/management-member/management-member.service";
import {ManagementBoard} from "./management-board";

export default async function ManagementMembersPage() {
  const { session, tenantId } = await requireTenantPermission("settings:read");
  const t = await getTranslations("management");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);
  const canManage = permissions.includes("settings:write");
  const members = await listManagementMembers(tenantId);

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="page-heading mt-1">{t("title")}</h1>
          <p className="page-description">{t("description")}</p>
        </div>
      </div>
      <ManagementBoard members={members} canManage={canManage} />
    </div>
  );
}
