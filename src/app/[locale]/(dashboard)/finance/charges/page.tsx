import {getTranslations} from "next-intl/server";
import {sessionAllows} from "@/core/auth/permissions";

import {requireTenantPermission} from "@/core/auth/session";
import {ChargesTable} from "@/modules/finance/components/charges-table";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {listChargeViews} from "@/modules/finance/services/finance-analytics.service";

export default async function ChargesPage() {
    const {session, tenantId} = await requireTenantPermission("finance:read");
    const t = await getTranslations("finance");
    const rows = await listChargeViews(tenantId);

    return (
        <>
            <FinancePageHeader
                title={t("chargesPage.title")}
                description={t("chargesPage.description")}
            />
            <ChargesTable
                rows={rows}
                canWrite={sessionAllows(session, "charge:write")}
            />
        </>
    );
}
