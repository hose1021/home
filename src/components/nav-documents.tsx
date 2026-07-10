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

const docs: { name: string; url: string; icon: typeof IconCoin; perm?: Permission }[] = [
  { name: "Бюджет", url: "/finance/budget", icon: IconCoin, perm: "budget:read" },
  { name: "Отчёты", url: "/reports", icon: IconReport, perm: "report:read" },
];

export function NavDocuments({ slug, permissions }: { slug: string; permissions?: Permission[] }) {
  const visible = docs.filter((item) => !item.perm || permissions?.includes(item.perm));
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Документы</SidebarGroupLabel>
      <SidebarMenu>
        {visible.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton render={<Link href={`/${slug}${item.url}`} />}>
              <item.icon className="size-5" />
              <span>{item.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
