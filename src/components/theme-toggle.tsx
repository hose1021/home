"use client";

import {IconMoon, IconSun} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {useTheme} from "next-themes";
import {Button} from "@/components/ui/button";

export function ThemeToggle() {
  const t = useTranslations("common");
  const {resolvedTheme, setTheme} = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t("toggleTheme")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-[4px] text-muted-foreground"
    >
      <IconMoon className="dark:hidden" />
      <IconSun className="hidden dark:block" />
    </Button>
  );
}
