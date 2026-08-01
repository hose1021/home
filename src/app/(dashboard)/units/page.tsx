import {requireTenantPermission} from "@/core/auth/session";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {listUnitsWithOwners} from "@/modules/unit/unit.service";
import {UnitsTable} from "./units-table";

export default async function UnitsPage() {
  const { session, tenantId } = await requireTenantPermission("unit:read");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);

  const units = await listUnitsWithOwners(tenantId);

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Реестр помещений</p>
          <h1 className="page-heading mt-1">Квартиры</h1>
          <p className="page-description">Все квартиры и нежилые помещения · {units.length} шт.</p>
        </div>
      </div>
      <UnitsTable
        units={units}
        canManage={permissions.includes("unit:write")}
      />
    </div>
  );
}
