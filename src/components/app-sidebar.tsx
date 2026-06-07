"use client";

import Link from "next/link";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavDocuments } from "./nav-documents";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import { IconInnerShadowTop } from "@tabler/icons-react";

export function AppSidebar({
  slug,
  userName,
  userEmail,
}: {
  slug: string;
  userName?: string;
  userEmail?: string;
}) {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href={`/${slug}`} />}>
              <IconInnerShadowTop className="size-5 shrink-0" />
              <span className="text-base font-semibold">Pilot Residence</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain slug={slug} />
        <NavDocuments slug={slug} />
        <NavSecondary slug={slug} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser slug={slug} userName={userName ?? slug} userEmail={userEmail} />
      </SidebarFooter>
    </Sidebar>
  );
}
