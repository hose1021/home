"use client";

import {IconBuildingCommunity} from "@tabler/icons-react";
import Image from "next/image";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import type {Session} from "@/core/auth/session";
import {Link} from "@/i18n/navigation";
import {NavMain} from "./nav-main";
import {NavSecondary} from "./nav-secondary";
import {NavUser} from "./nav-user";

export function AppSidebar({
  tenantName,
  tenantLogoUrl,
  session,
}: {
  tenantName: string;
  tenantLogoUrl?: string | null;
  session: Session;
}) {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="h-auto gap-3 rounded-[4px] px-2 py-1.5 hover:bg-transparent"
              render={<Link href="/" />}
            >
              {tenantLogoUrl ? (
                <Image src={tenantLogoUrl} alt={tenantName} width={36} height={36} className="size-9 shrink-0 rounded-[4px] object-cover" />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[4px] bg-[#0074E0] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.24)]">
                  <IconBuildingCommunity className="size-[18px]" />
                </span>
              )}
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-heading text-[0.9rem] font-bold text-sidebar-foreground">
                  {tenantName}
                </span>
                <span className="mt-0.5 truncate text-[11px] text-sidebar-foreground/50">
                  MMMC Platform
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-1 py-1">
        <NavMain session={session} />
        <NavSecondary className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-2 py-2">
        <NavUser userName={session.user.fullName} userEmail={session.user.username} />
      </SidebarFooter>
    </Sidebar>
  );
}
