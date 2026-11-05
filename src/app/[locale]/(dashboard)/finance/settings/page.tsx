import {getTranslations} from "next-intl/server";

import {getPermissionsForRoles, getPermissionsForRole, ROLE_LABELS, ROLE_ORDER} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {FinancePageHeader} from "@/modules/finance/components/finance-page-header";
import {SettingsForm} from "@/modules/finance/components/settings-form";
import {getFinancialSettings} from "@/modules/finance/services/settings.service";

export default async function FinanceSettingsPage() {
    const {session, tenantId} = await requireTenantPermission("finance:read");
    const permissions = getPermissionsForRoles(session.user.roles);
    const t = await getTranslations("finance");
    const settings = await getFinancialSettings(tenantId);
    const methods = ["cash", "bank_transfer", "card", "e_manat", "pos_terminal", "other"] as const;

    return (
        <>
            <FinancePageHeader eyebrow={t("title")} title={t("settingsPage.title")} description={t("settingsPage.description")} />

            <div className="grid gap-4 xl:grid-cols-2">
                {permissions.includes("settings:write")
                    ? <SettingsForm {...settings} />
                    : (
                        <section className="surface-panel p-5">
                            <h2 className="font-heading text-sm font-bold">{t("settingsPage.policy")}</h2>
                            <dl className="mt-3 grid gap-2 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-muted-foreground">{t("settingsPage.tariff")}</dt>
                                    <dd className="font-medium">{settings.tariffPerSqm.toFixed(2)}</dd>
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
                            {ROLE_ORDER.map((role) => (
                                <li key={role} className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 text-sm last:border-0">
                                    <span className="font-medium">{ROLE_LABELS[role]}</span>
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
