import {getTranslations} from "next-intl/server";

import {getPermissionsForRole, sessionAllows} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {PAYMENT_METHODS, ROLES} from "@/core/db/schema/enums";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {SettingsForm} from "@/modules/finance/components/settings-form";
import {formatAmount} from "@/modules/finance/money-format";
import {getFinancialSettings} from "@/modules/finance/services/settings.service";

export default async function FinanceSettingsPage() {
    const {session, tenantId} = await requireTenantPermission("finance:read");
    const t = await getTranslations("finance");
    const ta = await getTranslations("auth");
    const settings = await getFinancialSettings(tenantId);
    const methods = PAYMENT_METHODS;
    const canWriteSettings = sessionAllows(session, "settings:write");

    return (
        <>
            <FinancePageHeader title={t("settingsPage.title")} description={t("settingsPage.description")} />

            <div className="grid gap-4 xl:grid-cols-2">
                {canWriteSettings
                    ? <SettingsForm {...settings} />
                    : (
                        <section className="surface-panel p-5">
                            <h2 className="font-heading text-sm font-bold">{t("settingsPage.policy")}</h2>
                            <dl className="mt-3 grid gap-2 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-muted-foreground">{t("settingsPage.tariff")}</dt>
                                    <dd className="font-medium">{formatAmount(settings.tariffPerSqm)}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-muted-foreground">{t("settingsPage.billingStart")}</dt>
                                    <dd className="font-medium">{settings.billingStart}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-muted-foreground">{t("settingsPage.dueDay")}</dt>
                                    <dd className="font-medium">{settings.dueDay}</dd>
                                </div>
                            </dl>
                        </section>
                    )}

                <div className="flex flex-col gap-4">
                    <section className="surface-panel p-5">
                        <h2 className="font-heading text-sm font-bold">{t("settingsPage.methods")}</h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {methods.map((method) => (
                                <span key={method} className="rounded-[4px] bg-accent px-2 py-1 text-xs font-semibold">
                                    {t(`payments.paymentMethods.${method}` as Parameters<typeof t>[0])}
                                </span>
                            ))}
                        </div>
                    </section>

                    <section className="surface-panel overflow-hidden">
                        <div className="border-b border-border px-5 py-4">
                            <h2 className="font-heading text-sm font-bold">{t("settingsPage.access")}</h2>
                        </div>
                        <ul>
                            {ROLES.map((role) => (
                                <li key={role} className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 text-sm last:border-0">
                                    <span className="font-medium">{ta(`roleLabels.${role}`)}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {getPermissionsForRole(role).length} {t("settingsPage.permissions")}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>
        </>
    );
}
