"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {PASSWORD_MIN_LENGTH} from "@/core/auth/constants";
import {changeOwnPasswordAction} from "@/modules/settings/settings.actions";

const inputClass =
  "mt-1 field";

export function PasswordForm() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const currentPassword = (fd.get("currentPassword") as string) ?? "";
    const newPassword = (fd.get("newPassword") as string) ?? "";
    const confirmPassword = (fd.get("confirmPassword") as string) ?? "";

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      toast.error(t("passwordTooShort", {min: PASSWORD_MIN_LENGTH}));
      setPending(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      setPending(false);
      return;
    }

    try {
      await changeOwnPasswordAction(currentPassword, newPassword);
      e.currentTarget.reset();
      toast.success(t("passwordSaved"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password-current" className="block text-sm font-medium">{t("currentPassword")}</label>
        <input id="password-current" name="currentPassword" type="password" required className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password-new" className="block text-sm font-medium">{t("newPassword")}</label>
          <input id="password-new" name="newPassword" type="password" required minLength={PASSWORD_MIN_LENGTH} className={inputClass} />
          <p className="mt-1 text-xs text-muted-foreground">{t("passwordHintMin", {min: PASSWORD_MIN_LENGTH})}</p>
        </div>
        <div>
          <label htmlFor="password-confirm" className="block text-sm font-medium">{t("confirmPassword")}</label>
          <input id="password-confirm" name="confirmPassword" type="password" required minLength={PASSWORD_MIN_LENGTH} className={inputClass} />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : tc("save")}
        </Button>
      </div>
    </form>
  );
}
