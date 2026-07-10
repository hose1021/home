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
    IconFileReport,
    IconShieldCheck,
    IconTicket,
    IconTool,
    IconUsers,
} from "@tabler/icons-react";
import type {Permission} from "@/core/auth/permissions";

const navItems: { title: string; url: string; icon: typeof IconDashboard; perm?: Permission }[] = [
  { title: "Дашборд", url: "", icon: IconDashboard },
  { title: "Собственники", url: "/owners", icon: IconUsers, perm: "owner:read" },
  { title: "Финансы", url: "/finance", icon: IconCoin, perm: "finance:read" },
  { title: "Объявления", url: "/announcements", icon: IconBell, perm: "announcement:read" },
  { title: "Голосования", url: "/voting", icon: IconChecklist, perm: "voting:read" },
  { title: "Собрания", url: "/meetings", icon: IconCalendarEvent, perm: "meeting:read" },
  { title: "Заявки", url: "/tickets", icon: IconTicket, perm: "ticket:read" },
  { title: "Подрядчики", url: "/contractors", icon: IconTool, perm: "contractor:read" },
  { title: "Отчёты", url: "/reports", icon: IconFileReport, perm: "report:read" },
  { title: "Аудит", url: "/audit", icon: IconShieldCheck, perm: "audit:read" },
];

export function NavMain({ slug, permissions }: { slug: string; permissions?: Permission[] }) {
  const visible = navItems.filter((item) => !item.perm || permissions?.includes(item.perm));
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Меню</SidebarGroupLabel>
      <SidebarMenu>
        {visible.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton render={<Link href={`/${slug}${item.url}`} />}>
              <item.icon className="size-5" />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
