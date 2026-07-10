import {SidebarProvider} from "@/components/ui/sidebar";
import {AppSidebar} from "@/components/app-sidebar";
import {requireAuth} from "@/core/auth/session";
import {getTenantBySlug} from "@/modules/tenant/tenant.service";
import {getPermissionsForRoles} from "@/core/auth/permissions";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { user } = await requireAuth();
  const tenant = await getTenantBySlug(tenantSlug);
  const permissions = getPermissionsForRoles(user.roles);

  return (
    <SidebarProvider>
      <AppSidebar
        slug={tenantSlug}
        tenantName={tenant?.name ?? tenantSlug}
        tenantLogoUrl={tenant?.logoUrl ?? null}
        userName={user.fullName}
        userEmail={user.username}
        permissions={permissions}
      />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </SidebarProvider>
  );
}
