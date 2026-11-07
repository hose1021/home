"use client";

import {useTranslations} from "next-intl";
import {Badge} from "@/components/ui/badge";
import {ROLES, type Role} from "@/core/db/schema/enums";

const ROLE_VARIANT: Record<Role, "admin" | "management_member" | "commandant" | "secondary"> = {
  admin: "admin",
  management_member: "management_member",
  commandant: "commandant",
  owner: "secondary",
};

export function RoleBadge({role}: {role: Role}) {
  const t = useTranslations("auth");
  return <Badge variant={ROLE_VARIANT[role]}>{t(`roleLabels.${role}`)}</Badge>;
}

export function RoleBadges({roles}: {roles: readonly Role[]}) {
  if (roles.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => <RoleBadge key={role} role={role} />)}
    </div>
  );
}

export {ROLES};
