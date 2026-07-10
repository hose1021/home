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
import {IconInnerShadowTop} from "@tabler/icons-react";
import Image from "next/image";
import type {Permission} from "@/core/auth/permissions";

export function AppSidebar({
  slug,
  tenantName,
  tenantLogoUrl,
  userName,
  userEmail,
  permissions,
}: {
  slug: string;
  tenantName: string;
  tenantLogoUrl?: string | null;
  userName?: string;
  userEmail?: string;
  permissions?: Permission[];
}) {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href={`/${slug}`} />}>
              {tenantLogoUrl ? (
                <Image src={tenantLogoUrl} alt={tenantName} width={20} height={20} className="size-5 shrink-0 rounded" />
              ) : (
                <IconInnerShadowTop className="size-5 shrink-0" />
              )}
              <span className="text-base font-semibold">{tenantName}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain slug={slug} permissions={permissions} />
        <NavDocuments slug={slug} permissions={permissions} />
        <NavSecondary slug={slug} permissions={permissions} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser slug={slug} userName={userName ?? slug} userEmail={userEmail} />
      </SidebarFooter>
    </Sidebar>
  );
}
