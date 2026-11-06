import {getTranslations} from "next-intl/server";

import {getPermissionsForRoles} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {PaymentsTable} from "@/modules/finance/components/payments-table";
import {listPaymentViews} from "@/modules/finance/services/finance-analytics.service";
import {listUnitsWithOwners} from "@/modules/finance/services/finance-dashboard.service";

export default async function PaymentsPage() {
    const {session, tenantId} = await requireTenantPermission("finance:read");
    const permissions = getPermissionsForRoles(session.user.roles);
    const t = await getTranslations("finance");
    const [rows, units] = await Promise.all([
        listPaymentViews(tenantId),
        listUnitsWithOwners(tenantId),
    ]);

    return (
        <>
            <FinancePageHeader
                title={t("paymentsPage.title")}
                description={t("paymentsPage.description")}
            />
            <PaymentsTable
                rows={rows}
                units={units}
                canWrite={permissions.includes("payment:write")}
            />
        </>
    );
}
