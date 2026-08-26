import {requireTenantPermission} from "@/core/auth/session";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {FinanceDashboard} from "@/modules/finance/components/FinanceDashboard";
import {getFinanceDashboard} from "@/modules/finance/services/finance-dashboard.service";

export default async function FinancePage() {
  const { session, tenantId } = await requireTenantPermission("finance:read");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);

  const data = await getFinanceDashboard(tenantId);

  return (
    <FinanceDashboard
      {...data}
      canGenerateCharges={permissions.includes("charge:write")}
      canRegisterPayments={permissions.includes("payment:write")}
      canManageFunds={permissions.includes("fund:write")}
    />
  );
}
