"use client";

import {IconEye} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {useTransition} from "react";
import {toast} from "sonner";
import type {ViewAsInput} from "@/core/auth/view-as";
import {ROLES, type Role} from "@/core/db/schema/enums";
import {useRouter} from "@/i18n/navigation";
import {setViewAsAction} from "@/modules/impersonation/impersonation.actions";

type Target = {id: string; fullName: string; username: string};

function toInput(value: string): ViewAsInput {
  if (value.startsWith("role:")) return {kind: "role", role: value.slice(5) as Role};
  if (value.startsWith("user:")) return {kind: "user", userId: value.slice(5)};
  return {kind: "off"};
}

export function ViewAsSwitcher({value, targets}: {value: string; targets: Target[]}) {
  const t = useTranslations("viewAs");
  const ta = useTranslations("auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    startTransition(async () => {
      try {
        await setViewAsAction(toInput(next));
        toast.success(t("changed"));
        // The current page may not be allowed for the new identity; the dashboard always is.
        router.replace("/");
        router.refresh();
      } catch (error) {
        toast.error((error as Error).message || t("failed"));
      }
    });
  }

  return (
    <label className="flex items-center gap-1.5 rounded-[4px] border border-border px-2 py-1 text-xs text-muted-foreground">
      <IconEye className="size-3.5 shrink-0" />
      <span className="sr-only">{t("label")}</span>
      <select
        value={value}
        onChange={(event) => change(event.target.value)}
        disabled={pending}
        aria-label={t("label")}
        className="max-w-40 truncate bg-transparent text-xs font-medium text-foreground outline-none"
      >
        <option value="">{t("off")}</option>
        {ROLES.map((role) => (
          <option key={role} value={`role:${role}`}>{ta(`roleLabels.${role}`)}</option>
        ))}
        {targets.map((target) => (
          <option key={target.id} value={`user:${target.id}`}>{target.fullName}</option>
        ))}
      </select>
    </label>
  );
}
