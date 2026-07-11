import {redirect} from "next/navigation";
import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {Separator} from "@/components/ui/separator";
import {AppSidebar} from "@/components/app-sidebar";
import {getSession} from "@/core/auth/session";
import {getTenantById} from "@/modules/tenant/tenant.service";
import {getPermissionsForRoles} from "@/core/auth/permissions";
import {ThemeToggle} from "@/components/theme-toggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenant = await getTenantById(session.user.tenantId);
  const permissions = getPermissionsForRoles(session.user.roles);

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "18rem",
        "--header-height": "3.5rem",
      } as React.CSSProperties}
    >
      <AppSidebar
        tenantName={tenant?.name ?? "MMMC"}
        tenantLogoUrl={tenant?.logoUrl ?? null}
        userName={session.user.fullName}
        userEmail={session.user.username}
        permissions={permissions}
      />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-1 h-4" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{tenant?.name ?? "MMMC"}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">Управление домом</p>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <main className="@container/main flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
