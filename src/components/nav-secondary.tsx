"use client";

import Link from "next/link";
import {SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem,} from "@/components/ui/sidebar";
import {IconHelp, IconSettings} from "@tabler/icons-react";
import type {Permission} from "@/core/auth/permissions";

const secondary: { title: string; url: string; icon: typeof IconSettings; perm?: Permission }[] = [
  { title: "Настройки", url: "/settings", icon: IconSettings, perm: "settings:read" },
  { title: "Помощь", url: "#", icon: IconHelp },
];

export function NavSecondary({ slug, permissions, className }: { slug: string; permissions?: Permission[]; className?: string }) {
  const visible = secondary.filter((item) => !item.perm || permissions?.includes(item.perm));
  return (
    <SidebarGroup className={className}>
      <SidebarMenu>
        {visible.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton render={<Link href={item.url === "#" ? "#" : `/${slug}${item.url}`} />}>
              <item.icon className="size-5" />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
