"use client";

import {
    IconBell,
    IconBellRinging,
    IconBriefcase,
    IconBuilding,
    IconCoin,
    IconDashboard,
    IconReport,
    IconShieldCheck,
    IconTicket,
    IconUsers,
    IconUsersGroup,
} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import type {Permission} from "@/core/auth/permissions";
import {Link} from "@/i18n/navigation";
import {usePathname} from "@/i18n/navigation";

const itemClass =
    "relative h-9 rounded-[4px] px-3 text-sm font-semibold text-sidebar-foreground/70 " +
    "hover:bg-sidebar-accent hover:text-sidebar-foreground " +
    "data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground " +
    "data-active:before:absolute data-active:before:left-0 data-active:before:top-1/2 data-active:before:h-4 data-active:before:w-[2px] data-active:before:-translate-y-1/2 data-active:before:rounded-full data-active:before:bg-sidebar-primary " +
    "[&_svg]:text-sidebar-foreground/50 data-active:[&_svg]:text-sidebar-primary [&_svg]:transition-colors";

export function NavMain({ permissions }: { permissions?: Permission[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const navItems: { title: string; url: string; icon: typeof IconDashboard; perm?: Permission }[] = [
    { title: t("dashboard"), url: "/", icon: IconDashboard },
    { title: t("owners"), url: "/owners", icon: IconUsers, perm: "owner:read" },
    { title: t("units"), url: "/units", icon: IconBuilding, perm: "unit:read" },
    { title: t("finance"), url: "/finance", icon: IconCoin, perm: "finance:read" },
    { title: t("reports"), url: "/reports", icon: IconReport, perm: "report:read" },
    { title: t("announcements"), url: "/announcements", icon: IconBell, perm: "announcement:read" },
    { title: t("tickets"), url: "/tickets", icon: IconTicket, perm: "ticket:read" },
    { title: t("managementMembers"), url: "/management-members", icon: IconUsersGroup, perm: "settings:read" },
    { title: t("commandants"), url: "/commandants", icon: IconBriefcase, perm: "settings:read" },
    { title: t("notifications"), url: "/notifications", icon: IconBellRinging },
    { title: t("audit"), url: "/audit", icon: IconShieldCheck, perm: "audit:read" },
  ];

  const visible = navItems.filter((item) => !item.perm || permissions?.includes(item.perm));
  return (
    <SidebarGroup className="py-1">
      <SidebarGroupLabel className="h-7 px-3 text-[11px] font-bold uppercase tracking-[0.6px] text-sidebar-foreground/40">
        {t("management")}
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {visible.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              isActive={item.url === "/"
                ? pathname === "/"
                : pathname === item.url || pathname.startsWith(`${item.url}/`)}
              tooltip={item.title}
              className={itemClass}
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
