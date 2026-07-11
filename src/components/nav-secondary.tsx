"use client";

import Link from "next/link";
import {SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem,} from "@/components/ui/sidebar";
import {IconHelp, IconSettings} from "@tabler/icons-react";
import type {Permission} from "@/core/auth/permissions";
import {usePathname} from "next/navigation";

const secondary: { title: string; url: string; icon: typeof IconSettings; perm?: Permission }[] = [
  { title: "Настройки", url: "/settings", icon: IconSettings, perm: "settings:read" },
  { title: "Помощь", url: "#", icon: IconHelp },
];

export function NavSecondary({ permissions, className }: { permissions?: Permission[]; className?: string }) {
  const pathname = usePathname();
  const visible = secondary.filter((item) => !item.perm || permissions?.includes(item.perm));
  return (
    <SidebarGroup className={className}>
      <SidebarMenu>
        {visible.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              isActive={item.url !== "#" && pathname === item.url}
              className="h-9 rounded-lg px-3 text-sidebar-foreground/65"
              render={<Link href={item.url} />}
            >
              <item.icon className="size-[18px]" />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
