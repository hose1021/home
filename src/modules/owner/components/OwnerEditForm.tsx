"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {PASSWORD_MIN_LENGTH} from "@/core/auth/constants";
import {ROLES, type Role} from "@/core/db/schema/enums";
import {updateOwnerAction, updateOwnerPasswordAction} from "../owner.actions";

type OwnerData = {
  id: string;
  userId: string | null;
  fullName: string;
  phone: string | null;
  username: string;
  roles: string[];
};

export function OwnerEditForm({
  owner,
  canManageRoles,
  onDone,
}: {
  owner: OwnerData;
  canManageRoles?: boolean;
  onDone: () => void;
}) {
  const t = useTranslations("owners");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(owner.roles);
  const [newPassword, setNewPassword] = useState("");
  const [pwdPending, setPwdPending] = useState(false);

  function toggleRole(role: Role) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await updateOwnerAction(owner.id, {
        fullName: fd.get("fullName") as string,
        phone: (fd.get("phone") as string) || null,
        username: (fd.get("username") as string) || undefined,
        roles: selectedRoles as Role[],
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handlePasswordChange() {
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      toast.error(t("passwordTooShort", {min: PASSWORD_MIN_LENGTH}));
      return;
    }
    setPwdPending(true);
    try {
      await updateOwnerPasswordAction(owner.id, newPassword);
      setNewPassword("");
      toast.success(t("passwordUpdated"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPwdPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">{t("fullName")}</label>
        <input name="fullName" defaultValue={owner.fullName} required className="mt-1 field" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">{t("phone")}</label>
          <input name="phone" defaultValue={owner.phone ?? ""} className="mt-1 field" />
        </div>
        <div>
          <label className="block text-sm font-medium">{tc("auth.login")}</label>
          <input name="username" defaultValue={owner.username} className="mt-1 field" />
        </div>
      </div>

      {canManageRoles && (
        <div>
          <label className="block text-sm font-medium mb-2">{t("roles")}</label>
          <div className="space-y-2">
            {ROLES.map((role) => (
              <label key={role} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role)}
                  onChange={() => toggleRole(role)}
                  className="rounded border-border dark:border-border"
                />
                <span className="text-sm">{ta(`roleLabels.${role}`)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {canManageRoles && (
        <div className="rounded-[4px] border border-border p-3 dark:border-border">
          <label className="block text-sm font-medium mb-1">{t("changePassword")}</label>
          <p className="text-xs text-muted-foreground mb-2">{t("passwordHint", {min: PASSWORD_MIN_LENGTH})}</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("newPassword")}
              minLength={PASSWORD_MIN_LENGTH}
              className="field"
            />
            <Button
              type="button"
              onClick={handlePasswordChange}
              disabled={pwdPending || newPassword.length < PASSWORD_MIN_LENGTH}
              className="shrink-0"
            >
              {pwdPending ? "..." : t("setPassword")}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onDone}>{tc("cancel")}</Button>
        <Button type="submit" disabled={pending}>{pending ? t("saving") : tc("save")}</Button>
      </div>
    </form>
  );
}
