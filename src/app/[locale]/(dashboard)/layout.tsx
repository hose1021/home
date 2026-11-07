import {IconEye} from "@tabler/icons-react";
import {getLocale, getTranslations} from "next-intl/server";
import {AppSidebar} from "@/components/app-sidebar";
import {LanguageSwitcher} from "@/components/language-switcher";
import {ReadOnlyGuard} from "@/components/read-only-guard";
import {ThemeToggle} from "@/components/theme-toggle";
import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {ViewAsSwitcher} from "@/components/view-as-switcher";
import {getSession} from "@/core/auth/session";
import {canActAs, serializeViewAs} from "@/core/auth/view-as";
import {redirect} from "@/i18n/navigation";
import {listViewAsTargets} from "@/modules/impersonation/impersonation.service";
import {getTenantById} from "@/modules/tenant/tenant.service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const session = await getSession();
  if (!session) {
    redirect({href: "/login", locale});
  }

  const tenant = await getTenantById(session!.user.tenantId);
  const canSwitchView = canActAs(session!.actor);
  const viewTargets = canSwitchView ? await listViewAsTargets(session!.actor.tenantId) : [];
  const currentView = serializeViewAs(session!.viewAs) ?? "";
  const viewName = session!.viewAs
    ? session!.viewAs.kind === "role"
      ? t(`auth.roleLabels.${session!.viewAs.role}`)
      : session!.user.fullName
    : null;

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
        session={session!}
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
            {canSwitchView && <ViewAsSwitcher value={currentView} targets={viewTargets} />}
            <span className="hidden items-center gap-2 rounded-[4px] border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground sm:inline-flex">
              <span className="size-1.5 rounded-full bg-[#6CDB00]" />
              {new Date().toLocaleDateString(locale, {day: "2-digit", month: "short", year: "numeric"})}
            </span>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        {viewName && (
          <div className="flex flex-wrap items-center gap-2 border-b border-warning/40 bg-warning/10 px-4 py-2 text-xs font-medium md:px-6">
            <IconEye className="size-4 shrink-0 text-warning" />
            <span>{t("viewAs.viewingAs", {name: viewName})}</span>
            <span className="text-muted-foreground">· {t("viewAs.readOnly")}</span>
          </div>
        )}
        <main className="@container/main flex-1 overflow-y-auto">
          <ReadOnlyGuard active={Boolean(viewName)} message={t("viewAs.readOnly")}>
            {children}
          </ReadOnlyGuard>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
