"use client";

import {IconHelp, IconSettings} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem,} from "@/components/ui/sidebar";
import type {Permission} from "@/core/auth/permissions";
import {Link} from "@/i18n/navigation";
import {usePathname} from "@/i18n/navigation";

export function NavSecondary({ permissions, className }: { permissions?: Permission[]; className?: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const secondary: { title: string; url: string; icon: typeof IconSettings; perm?: Permission }[] = [
    { title: t("settings"), url: "/settings", icon: IconSettings },
    { title: t("help"), url: "#", icon: IconHelp },
  ];

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
