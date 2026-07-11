"use client";

import Link from "next/link";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {NavMain} from "./nav-main";
import {NavDocuments} from "./nav-documents";
import {NavSecondary} from "./nav-secondary";
import {NavUser} from "./nav-user";
import {IconBuildingCommunity} from "@tabler/icons-react";
import Image from "next/image";
import type {Permission} from "@/core/auth/permissions";

export function AppSidebar({
  tenantName,
  tenantLogoUrl,
  userName,
  userEmail,
  permissions,
}: {
  tenantName: string;
  tenantLogoUrl?: string | null;
  userName?: string;
  userEmail?: string;
  permissions?: Permission[];
}) {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/70">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              {tenantLogoUrl ? (
                <Image src={tenantLogoUrl} alt={tenantName} width={32} height={32} className="size-8 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <IconBuildingCommunity className="size-4" />
                </span>
              )}
              <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{tenantName}</span>
                <span className="truncate text-xs text-sidebar-foreground/55">MMMC Platform</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain permissions={permissions} />
        <NavDocuments permissions={permissions} />
        <NavSecondary permissions={permissions} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser userName={userName ?? "User"} userEmail={userEmail} />
      </SidebarFooter>
    </Sidebar>
  );
}
