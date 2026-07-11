"use client";

import {useTheme} from "next-themes";
import {IconMoon, IconSun} from "@tabler/icons-react";
import {Button} from "@/components/ui/button";

export function ThemeToggle() {
  const {resolvedTheme, setTheme} = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Переключить цветовую тему"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-lg text-muted-foreground"
    >
      <IconMoon className="dark:hidden" />
      <IconSun className="hidden dark:block" />
    </Button>
  );
}
