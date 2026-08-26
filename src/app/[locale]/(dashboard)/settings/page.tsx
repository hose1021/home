import {eq} from "drizzle-orm";
import {getPermissionsForRoles} from "@/core/auth/permissions";
import {requireAuth} from "@/core/auth/session";
import {db} from "@/core/db";
import {users} from "@/core/db/schema/users";
import {getTenantById} from "@/modules/tenant/tenant.service";
import {PasswordForm} from "./password-form";
import {ProfileForm} from "./profile-form";
import {SettingsForm} from "./settings-form";

export default async function SettingsPage() {
  const session = await requireAuth();
  const permissions = getPermissionsForRoles(session.user.roles);
  const canManageOrg = permissions.includes("settings:write");

  const [user, tenant] = await Promise.all([
    db
      .select({ fullName: users.fullName, phone: users.phone, username: users.username })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
    getTenantById(session.user.tenantId),
  ]);

  return (
    <div className="page-shell max-w-2xl">
      <div>
        <p className="text-sm text-muted-foreground">Управление домом</p>
        <h1 className="page-heading mt-1">Настройки</h1>
        <p className="page-description">Личный профиль и настройки организации</p>
      </div>

      <section className="surface-panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">Личный профиль</h2>
        <p className="mt-1 text-sm text-muted-foreground">Имя и телефон отображаются для соседей и правления</p>
        <div className="mt-4">
          <ProfileForm
            profile={{
              fullName: user?.[0]?.fullName ?? session.user.fullName,
              phone: user?.[0]?.phone ?? null,
            }}
          />
        </div>
      </section>

      <section className="surface-panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">Пароль</h2>
        <p className="mt-1 text-sm text-muted-foreground">При смене пароля остальные сессии будут завершены</p>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </section>

      {canManageOrg && tenant && (
        <section className="surface-panel p-5 sm:p-6">
          <h2 className="text-base font-semibold">Организация</h2>
          <p className="mt-1 text-sm text-muted-foreground">Видно только администраторам</p>
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
