"use client";

import {IconHelp, IconSettings} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem,} from "@/components/ui/sidebar";
import {Link} from "@/i18n/navigation";
import {usePathname} from "@/i18n/navigation";

export function NavSecondary({className}: {className?: string}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const items = [
    {title: t("settings"), url: "/settings", icon: IconSettings},
    {title: t("help"), url: "/help", icon: IconHelp},
  ];

  return (
    <SidebarGroup className={className}>
      <SidebarMenu className="gap-0.5">
        {items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              isActive={pathname === item.url}
              className="relative h-9 rounded-[4px] px-3 text-sm font-semibold text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:before:absolute data-active:before:left-0 data-active:before:top-1/2 data-active:before:h-4 data-active:before:w-[2px] data-active:before:-translate-y-1/2 data-active:before:rounded-full data-active:before:bg-sidebar-primary [&_svg]:text-sidebar-foreground/45"
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
