"use client";

import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { IconReport, IconCoin } from "@tabler/icons-react";

const docs = [
  { name: "Бюджет", url: "/finance/budget", icon: IconCoin },
  { name: "Отчёты", url: "/reports", icon: IconReport },
];

export function NavDocuments({ slug }: { slug: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Документы</SidebarGroupLabel>
      <SidebarMenu>
        {docs.map((item) => (
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
