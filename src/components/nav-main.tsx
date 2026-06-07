"use client";

import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  IconDashboard,
  IconUsers,
  IconCoin,
  IconChecklist,
  IconCalendarEvent,
  IconTicket,
  IconTool,
  IconFileReport,
  IconShieldCheck,
} from "@tabler/icons-react";

const navItems = [
  { title: "Дашборд", url: "", icon: IconDashboard },
  { title: "Собственники", url: "/owners", icon: IconUsers },
  { title: "Финансы", url: "/finance", icon: IconCoin },
  { title: "Голосования", url: "/voting", icon: IconChecklist },
  { title: "Собрания", url: "/meetings", icon: IconCalendarEvent },
  { title: "Заявки", url: "/tickets", icon: IconTicket },
  { title: "Подрядчики", url: "/contractors", icon: IconTool },
  { title: "Отчёты", url: "/reports", icon: IconFileReport },
  { title: "Аудит", url: "/audit", icon: IconShieldCheck },
];

export function NavMain({ slug }: { slug: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Меню</SidebarGroupLabel>
      <SidebarMenu>
        {navItems.map((item) => (
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
