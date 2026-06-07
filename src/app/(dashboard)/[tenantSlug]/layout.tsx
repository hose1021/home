import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { requireAuth } from "@/core/auth/session";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { user } = await requireAuth();

  return (
    <SidebarProvider>
      <AppSidebar slug={tenantSlug} userName={user.fullName} userEmail={user.username} />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </SidebarProvider>
  );
}
