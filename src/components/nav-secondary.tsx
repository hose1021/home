"use client";

import Link from "next/link";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { IconSettings, IconHelp } from "@tabler/icons-react";

const secondary = [
  { title: "Настройки", url: "/settings", icon: IconSettings },
  { title: "Помощь", url: "#", icon: IconHelp },
];

export function NavSecondary({ slug, className }: { slug: string; className?: string }) {
  return (
    <SidebarGroup className={className}>
      <SidebarMenu>
        {secondary.map((item) => (
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
