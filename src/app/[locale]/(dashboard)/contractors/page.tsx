import {getTranslations} from "next-intl/server";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {listContractors} from "@/modules/contractor/contractor.service";
import {ContractorsBoard} from "./contractors-board";

export default async function ContractorsPage() {
  const { session, tenantId } = await requireTenantPermission("contractor:read");
  const t = await getTranslations("contractors");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);
  const canManage = permissions.includes("contractor:write");
  const contractors = await listContractors(tenantId);

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="page-heading mt-1">{t("title")}</h1>
          <p className="page-description">{t("description")}</p>
        </div>
      </div>
      <ContractorsBoard contractors={contractors} canManage={canManage} />
    </div>
  );
}
