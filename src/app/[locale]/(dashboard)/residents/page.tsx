import {getTranslations} from "next-intl/server";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {listResidents} from "@/modules/resident/resident.service";
import {listUnits} from "@/modules/unit/unit.service";
import {ResidentsBoard} from "./residents-board";

export default async function ResidentsPage() {
  const { session, tenantId } = await requireTenantPermission("resident:read");
  const t = await getTranslations("residents");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);
  const canManage = permissions.includes("resident:write");
  const [residents, units] = await Promise.all([
    listResidents(tenantId),
    listUnits(tenantId),
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
      <ResidentsBoard residents={residents} units={units} canManage={canManage} />
    </div>
  );
}
