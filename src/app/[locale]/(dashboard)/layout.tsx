import {getTranslations} from "next-intl/server";
import {AppSidebar} from "@/components/app-sidebar";
import {LanguageSwitcher} from "@/components/language-switcher";
import {ThemeToggle} from "@/components/theme-toggle";
import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {getPermissionsForRoles} from "@/core/auth/permissions";
import {getSession} from "@/core/auth/session";
import {redirect} from "@/i18n/navigation";
import {getTenantById} from "@/modules/tenant/tenant.service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations();
  const session = await getSession();
  if (!session) {
    redirect({href: "/login", locale: "ru"});
  }

  const tenant = await getTenantById(session!.user.tenantId);
  const permissions = getPermissionsForRoles(session!.user.roles);

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "18rem",
        "--header-height": "3.75rem",
      } as React.CSSProperties}
    >
      <AppSidebar
        tenantName={tenant?.name ?? "MMMC"}
        tenantLogoUrl={tenant?.logoUrl ?? null}
        userName={session!.user.fullName}
        userEmail={session!.user.username}
        permissions={permissions}
      />
      <SidebarInset className="min-w-0 bg-background">
        <header className="topbar sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <span aria-hidden className="h-5 w-px bg-border" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-muted-foreground">
                {t("nav.houseManagement")}
              </p>
              <p className="mt-0.5 truncate font-heading text-sm font-bold">
                {tenant?.name ?? "MMMC"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hidden items-center gap-2 rounded-[4px] border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground sm:inline-flex">
              <span className="size-1.5 rounded-full bg-[#6CDB00]" />
              {new Date().toLocaleDateString("ru", {day: "2-digit", month: "short", year: "numeric"})}
            </span>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="@container/main flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
