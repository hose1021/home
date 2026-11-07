import {getTranslations} from "next-intl/server";
import {hasStaffRole, sessionAllows} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {listOwnersWithDebt} from "@/modules/owner/owner.service";
import {OwnerTable} from "./owner-table";

export default async function OwnersPage() {
  const t = await getTranslations();
  const { session, tenantId } = await requireTenantPermission("owner:read");
  const restrictToCurrentOwner = !hasStaffRole(session.user.roles);

  const owners = await listOwnersWithDebt(tenantId, {
    userId: restrictToCurrentOwner ? session.user.id : undefined,
  });

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("owners.registry")}</p>
          <h1 className="page-heading mt-1">{t("owners.title")}</h1>
          <p className="page-description">{t("owners.description")} · {owners.length} {t("common.people")}</p>
        </div>
      </div>
      <OwnerTable
        owners={owners}
        canManage={sessionAllows(session, "owner:write")}
        canManageRoles={sessionAllows(session, "user:manage")}
      />
    </div>
  );
}
