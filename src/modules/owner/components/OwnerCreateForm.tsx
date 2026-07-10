"use client";

import {useState} from "react";
import {createOwnerAction} from "../owner.actions";

export function OwnerCreateForm({
  slug,
  onDone,
}: {
  slug: string;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await createOwnerAction(slug, {
        fullName: fd.get("fullName") as string,
        phone: (fd.get("phone") as string) || undefined,
        username: fd.get("username") as string,
        password: fd.get("password") as string,
        unitNumber: fd.get("unitNumber") as string,
        entrance: Number(fd.get("entrance")),
        floor: Number(fd.get("floor")),
        type: fd.get("type") as "residential" | "commercial" | "parking" | "storage" | "other",
        area: fd.get("area") as string,
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
      <fieldset className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium">Собственник</legend>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">ФИО</label>
            <input name="fullName" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          </div>
          <div>
            <label className="block text-sm font-medium">Телефон</label>
            <input name="phone" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Логин</label>
              <input name="username" placeholder="имя.фамилия" pattern="[\p{L}]+\.[\p{L}]+" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
            </div>
            <div>
              <label className="block text-sm font-medium">Пароль</label>
              <input name="password" type="password" minLength={8} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium">Квартира</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">№ квартиры</label>
            <input name="unitNumber" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          </div>
          <div>
            <label className="block text-sm font-medium">Этаж</label>
            <input name="floor" type="number" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          </div>
          <div>
            <label className="block text-sm font-medium">Подъезд</label>
            <input name="entrance" type="number" defaultValue={1} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          </div>
          <div>
            <label className="block text-sm font-medium">Тип</label>
            <select name="type" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <option value="residential">Жилая</option>
              <option value="commercial">Коммерческая</option>
              <option value="parking">Парковка</option>
              <option value="storage">Склад</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Площадь (м²)</label>
            <input name="area" type="number" step="0.01" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          </div>
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onDone} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Отмена</button>
        <button type="submit" disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">{pending ? "Создание..." : "Создать"}</button>
      </div>
    </form>
  );
}
