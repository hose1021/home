"use client";

import Link from "next/link";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {IconCoin, IconReport} from "@tabler/icons-react";
import type {Permission} from "@/core/auth/permissions";
import {usePathname} from "next/navigation";

const docs: { name: string; url: string; icon: typeof IconCoin; perm?: Permission }[] = [
  { name: "Бюджет", url: "/finance/budget", icon: IconCoin, perm: "budget:read" },
  { name: "Отчёты", url: "/reports", icon: IconReport, perm: "report:read" },
];

export function NavDocuments({ permissions }: { permissions?: Permission[] }) {
  const pathname = usePathname();
  const visible = docs.filter((item) => !item.perm || permissions?.includes(item.perm));
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">Документы</SidebarGroupLabel>
      <SidebarMenu>
        {visible.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
              tooltip={item.name}
              className="h-9 rounded-lg px-3 font-medium data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
              render={<Link href={item.url} />}
            >
              <item.icon className="size-[18px]" />
              <span>{item.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
