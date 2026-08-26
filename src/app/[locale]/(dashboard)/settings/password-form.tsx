"use client";

import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {changeOwnPasswordAction} from "@/modules/settings/settings.actions";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function PasswordForm() {
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const currentPassword = (fd.get("currentPassword") as string) ?? "";
    const newPassword = (fd.get("newPassword") as string) ?? "";
    const confirmPassword = (fd.get("confirmPassword") as string) ?? "";

    if (newPassword.length < 12) {
      toast.error("Пароль должен быть не менее 12 символов");
      setPending(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      setPending(false);
      return;
    }

    try {
      await changeOwnPasswordAction(currentPassword, newPassword);
      e.currentTarget.reset();
      toast.success("Пароль изменён. Остальные сессии сброшены.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password-current" className="block text-sm font-medium">Текущий пароль</label>
        <input id="password-current" name="currentPassword" type="password" required className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password-new" className="block text-sm font-medium">Новый пароль</label>
          <input id="password-new" name="newPassword" type="password" required minLength={12} className={inputClass} />
          <p className="mt-1 text-xs text-muted-foreground">Минимум 12 символов</p>
        </div>
        <div>
          <label htmlFor="password-confirm" className="block text-sm font-medium">Повторите пароль</label>
          <input id="password-confirm" name="confirmPassword" type="password" required minLength={12} className={inputClass} />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохранение..." : "Сменить пароль"}
        </Button>
      </div>
    </form>
  );
}
