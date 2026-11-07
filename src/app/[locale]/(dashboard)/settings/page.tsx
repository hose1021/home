import {getTranslations} from "next-intl/server";
import {sessionAllows} from "@/core/auth/permissions";
import {requireAuth} from "@/core/auth/session";
import {getOwnProfile} from "@/modules/settings/settings.service";
import {getTenantById} from "@/modules/tenant/tenant.service";
import {PasswordForm} from "./password-form";
import {ProfileForm} from "./profile-form";
import {SettingsForm} from "./settings-form";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const session = await requireAuth();
  const canManageOrg = sessionAllows(session, "settings:write");

  const [user, tenant] = await Promise.all([
    getOwnProfile(session.user.id),
    getTenantById(session.user.tenantId),
  ]);

  return (
    <div className="page-shell">
      <div>
        <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="page-heading mt-1">{t("title")}</h1>
        <p className="page-description">{t("description")}</p>
      </div>

      <section className="surface-panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">{t("profileTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("profileHint")}</p>
        <div className="mt-4">
          <ProfileForm
            profile={{
              fullName: user?.fullName ?? session.user.fullName,
              phone: user?.phone ?? null,
            }}
          />
        </div>
      </section>

      <section className="surface-panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">{t("passwordTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("passwordHint")}</p>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </section>

      {canManageOrg && tenant && (
        <section className="surface-panel p-5 sm:p-6">
          <h2 className="text-base font-semibold">{t("organizationTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("organizationHint")}</p>
          <div className="mt-4">
            <SettingsForm
              tenant={{
                name: tenant.name,
                slug: tenant.slug,
                address: tenant.address,
                phone: tenant.phone,
                taxId: tenant.taxId,
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
