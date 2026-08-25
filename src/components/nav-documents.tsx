"use client";

import {Link} from "@/i18n/navigation";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {IconCoin, IconReport} from "@tabler/icons-react";
import type {Permission} from "@/core/auth/permissions";
import {usePathname} from "@/i18n/navigation";
import {useTranslations} from "next-intl";

export function NavDocuments({ permissions }: { permissions?: Permission[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const docs: { name: string; url: string; icon: typeof IconCoin; perm?: Permission }[] = [
    { name: t("budget"), url: "/finance/budget", icon: IconCoin, perm: "budget:read" },
    { name: t("reports"), url: "/reports", icon: IconReport, perm: "report:read" },
  ];

  const visible = docs.filter((item) => !item.perm || permissions?.includes(item.perm));
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">{t("documents")}</SidebarGroupLabel>
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
