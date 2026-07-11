"use client";

import Link from "next/link";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
    IconBell,
    IconCalendarEvent,
    IconChecklist,
    IconCoin,
    IconDashboard,
    IconShieldCheck,
    IconTicket,
    IconTool,
    IconUsers,
} from "@tabler/icons-react";
import type {Permission} from "@/core/auth/permissions";
import {usePathname} from "next/navigation";

const navItems: { title: string; url: string; icon: typeof IconDashboard; perm?: Permission }[] = [
  { title: "Дашборд", url: "/", icon: IconDashboard },
  { title: "Собственники", url: "/owners", icon: IconUsers, perm: "owner:read" },
  { title: "Финансы", url: "/finance", icon: IconCoin, perm: "finance:read" },
  { title: "Объявления", url: "/announcements", icon: IconBell, perm: "announcement:read" },
  { title: "Голосования", url: "/voting", icon: IconChecklist, perm: "voting:read" },
  { title: "Собрания", url: "/meetings", icon: IconCalendarEvent, perm: "meeting:read" },
  { title: "Заявки", url: "/tickets", icon: IconTicket, perm: "ticket:read" },
  { title: "Подрядчики", url: "/contractors", icon: IconTool, perm: "contractor:read" },
  { title: "Аудит", url: "/audit", icon: IconShieldCheck, perm: "audit:read" },
];

export function NavMain({ permissions }: { permissions?: Permission[] }) {
  const pathname = usePathname();
  const visible = navItems.filter((item) => !item.perm || permissions?.includes(item.perm));
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">Управление</SidebarGroupLabel>
      <SidebarMenu>
        {visible.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              isActive={item.url === "/"
                ? pathname === "/"
                : pathname === item.url || pathname.startsWith(`${item.url}/`)}
              tooltip={item.title}
              className="h-9 px-3 font-medium"
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
