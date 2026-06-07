"use client";

import { useState } from "react";
import { updateOwnerAction } from "../owner.actions";

const ALL_ROLES = [
  { value: "owner", label: "Собственник" },
  { value: "management_member", label: "Правление" },
  { value: "commandant", label: "Председатель" },
  { value: "admin", label: "Админ" },
];

type OwnerData = {
  id: string;
  userId: string | null;
  fullName: string;
  phone: string | null;
  username: string;
  roles: string[];
};

export function OwnerEditForm({
  slug,
  owner,
  onDone,
}: {
  slug: string;
  owner: OwnerData;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(owner.roles);

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
      await updateOwnerAction(slug, owner.id, {
        fullName: fd.get("fullName") as string,
        phone: (fd.get("phone") as string) || null,
        username: (fd.get("username") as string) || undefined,
        roles: selectedRoles as ("owner" | "management_member" | "commandant" | "admin")[],
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
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

      <div>
        <label className="block text-sm font-medium mb-2">Роли</label>
        <div className="space-y-2">
          {ALL_ROLES.map((r) => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRoles.includes(r.value)}
                onChange={() => toggleRole(r.value)}
                className="rounded border-zinc-300 dark:border-zinc-700"
              />
              <span className="text-sm">{r.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onDone} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Отмена</button>
        <button type="submit" disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">{pending ? "Сохранение..." : "Сохранить"}</button>
      </div>
    </form>
  );
}
