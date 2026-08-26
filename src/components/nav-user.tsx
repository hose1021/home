"use client";

import {IconBell, IconLogout, IconSelector, IconSettings, IconUser,} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar} from "@/components/ui/sidebar";
import {useRouter} from "@/i18n/navigation";

export function NavUser({userName, userEmail}: {userName: string; userEmail?: string}) {
  const t = useTranslations("auth");
  const {isMobile} = useSidebar();
  const router = useRouter();
  const initials = userName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  async function logout() {
    try {
      await fetch("/api/auth/logout", {method: "POST"});
    } catch {
      // clear session client-side anyway; server session expires on its own
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground" />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">{initials || "U"}</AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{userName}</span>
              {userEmail && <span className="truncate text-xs text-sidebar-foreground/55">{userEmail}</span>}
            </div>
            <IconSelector className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56 rounded-lg" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{initials || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 leading-tight">
                    <span className="truncate font-medium">{userName}</span>
                    {userEmail && <span className="truncate text-xs text-muted-foreground">{userEmail}</span>}
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/")}><IconUser /> {t("profile")}</DropdownMenuItem>
              <DropdownMenuItem><IconBell /> {t("notifications")}</DropdownMenuItem>
              <DropdownMenuItem><IconSettings /> {t("settings")}</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={logout}><IconLogout /> {t("logout")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
