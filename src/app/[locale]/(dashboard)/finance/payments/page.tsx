import {getTranslations} from "next-intl/server";
import {sessionAllows} from "@/core/auth/permissions";

import {requireTenantPermission} from "@/core/auth/session";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {PaymentsTable} from "@/modules/finance/components/payments-table";
import {listPayableUnits} from "@/modules/finance/services/charge.service";
import {listPaymentViews} from "@/modules/finance/services/finance-analytics.service";

export default async function PaymentsPage() {
    const {session, tenantId} = await requireTenantPermission("finance:read");
    const t = await getTranslations("finance");
    const [rows, units] = await Promise.all([
        listPaymentViews(tenantId),
        listPayableUnits(tenantId),
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
                canWrite={sessionAllows(session, "payment:write")}
            />
        </>
    );
}
