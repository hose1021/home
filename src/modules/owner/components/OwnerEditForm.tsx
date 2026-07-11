"use client";

import {useState} from "react";
import {updateOwnerAction, updateOwnerPasswordAction} from "../owner.actions";
import {type Role, ROLE_LABELS, ROLE_ORDER} from "@/core/auth/permissions";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";

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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(owner.roles);
  const [newPassword, setNewPassword] = useState("");
  const [pwdPending, setPwdPending] = useState(false);

  function toggleRole(role: string) {
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
    if (newPassword.length < 8) {
      toast.error("Пароль должен быть не менее 8 символов");
      return;
    }
    setPwdPending(true);
    try {
      await updateOwnerPasswordAction(owner.id, newPassword);
      setNewPassword("");
      toast.success("Пароль обновлён. Сессия пользователя сброшена.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPwdPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">ФИО</label>
        <input name="fullName" defaultValue={owner.fullName} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Телефон</label>
          <input name="phone" defaultValue={owner.phone ?? ""} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </div>
        <div>
          <label className="block text-sm font-medium">Логин</label>
          <input name="username" defaultValue={owner.username} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </div>
      </div>

      {canManageRoles && (
        <div>
          <label className="block text-sm font-medium mb-2">Роли</label>
          <div className="space-y-2">
            {ROLE_ORDER.map((r) => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(r)}
                  onChange={() => toggleRole(r)}
                  className="rounded border-zinc-300 dark:border-zinc-700"
                />
                <span className="text-sm">{ROLE_LABELS[r]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {canManageRoles && (
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <label className="block text-sm font-medium mb-1">Сменить пароль</label>
          <p className="text-xs text-zinc-500 mb-2">Минимум 8 символов. Все сессии пользователя будут сброшены.</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Новый пароль"
              minLength={8}
              className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <Button
              type="button"
              onClick={handlePasswordChange}
              disabled={pwdPending || newPassword.length < 8}
              className="shrink-0"
            >
              {pwdPending ? "..." : "Задать"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onDone}>Отмена</Button>
        <Button type="submit" disabled={pending}>{pending ? "Сохранение..." : "Сохранить"}</Button>
      </div>
    </form>
  );
}
