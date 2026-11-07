import {getTranslations} from "next-intl/server";
import {sessionAllows} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {listUnitsWithOwners} from "@/modules/unit/unit.service";
import {UnitsTable} from "./units-table";

export default async function UnitsPage() {
  const t = await getTranslations("units");
  const { session, tenantId } = await requireTenantPermission("unit:read");

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
        canManage={sessionAllows(session, "unit:write")}
      />
    </div>
  );
}
