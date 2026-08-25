"use client";

import {Link} from "@/i18n/navigation";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
    IconBell,
    IconBriefcase,
    IconBuilding,
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
import {usePathname} from "@/i18n/navigation";
import {useTranslations} from "next-intl";

export function NavMain({ permissions }: { permissions?: Permission[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const navItems: { title: string; url: string; icon: typeof IconDashboard; perm?: Permission }[] = [
    { title: t("dashboard"), url: "/", icon: IconDashboard },
    { title: t("owners"), url: "/owners", icon: IconUsers, perm: "owner:read" },
    { title: t("units"), url: "/units", icon: IconBuilding, perm: "unit:read" },
    { title: t("finance"), url: "/finance", icon: IconCoin, perm: "finance:read" },
    { title: t("announcements"), url: "/announcements", icon: IconBell, perm: "announcement:read" },
    { title: t("voting"), url: "/voting", icon: IconChecklist, perm: "voting:read" },
    { title: t("meetings"), url: "/meetings", icon: IconCalendarEvent, perm: "meeting:read" },
    { title: t("tickets"), url: "/tickets", icon: IconTicket, perm: "ticket:read" },
    { title: t("contractors"), url: "/contractors", icon: IconTool, perm: "contractor:read" },
    { title: t("commandants"), url: "/commandants", icon: IconBriefcase, perm: "settings:read" },
    { title: t("audit"), url: "/audit", icon: IconShieldCheck, perm: "audit:read" },
  ];

  const visible = navItems.filter((item) => !item.perm || permissions?.includes(item.perm));
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">{t("management")}</SidebarGroupLabel>
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
