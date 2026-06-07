"use client";

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { IconUser } from "@tabler/icons-react";

export function NavUser({ slug, userName, userEmail }: { slug: string; userName: string; userEmail?: string }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton render={<Link href={`/${slug}`} />}>
          <div className="flex size-5 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
            <IconUser className="size-3" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userName}</p>
            {userEmail && <p className="truncate text-xs text-zinc-400">{userEmail}</p>}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
