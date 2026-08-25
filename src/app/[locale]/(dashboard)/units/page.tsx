import {requireTenantPermission} from "@/core/auth/session";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {listUnitsWithOwners} from "@/modules/unit/unit.service";
import {UnitsTable} from "./units-table";
import {getTranslations} from "next-intl/server";

export default async function UnitsPage() {
  const t = await getTranslations("units");
  const { session, tenantId } = await requireTenantPermission("unit:read");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);

  const units = await listUnitsWithOwners(tenantId);

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("registry")}</p>
          <h1 className="page-heading mt-1">{t("title")}</h1>
          <p className="page-description">{t("description", {count: units.length})}</p>
        </div>
      </div>
      <UnitsTable
        units={units}
        canManage={permissions.includes("unit:write")}
      />
    </div>
  );
}
