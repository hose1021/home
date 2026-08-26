import {getTranslations} from "next-intl/server";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {listContractors} from "@/modules/contractor/contractor.service";
import {listWorkOrders} from "@/modules/work-order/work-order.service";
import {WorkOrdersBoard} from "./work-orders-board";

export default async function WorkOrdersPage() {
  const { session, tenantId } = await requireTenantPermission("work_order:read");
  const t = await getTranslations("workOrders");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);
  const canManage = permissions.includes("work_order:write");
  const [orders, contractors] = await Promise.all([
    listWorkOrders(tenantId),
    listContractors(tenantId),
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
      <WorkOrdersBoard orders={orders} contractors={contractors} canManage={canManage} />
    </div>
  );
}
