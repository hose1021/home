"use client";

import {useState} from "react";
import {createTicketAction} from "../ticket.actions";
import type {TicketCategory, TicketPriority} from "../ticket.service";
import {toast} from "sonner";

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "plumbing", label: "Сантехника" },
  { value: "electrical", label: "Электрика" },
  { value: "cleaning", label: "Уборка" },
  { value: "structural", label: "Конструктив" },
  { value: "elevator", label: "Лифт" },
  { value: "pest_control", label: "Дезинсекция" },
  { value: "yard", label: "Двор / территория" },
  { value: "security", label: "Безопасность" },
  { value: "other", label: "Другое" },
];

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Обычный" },
  { value: "high", label: "Высокий" },
  { value: "urgent", label: "Срочный" },
];

export function TicketCreateForm({
  slug,
  units,
  onDone,
}: {
  slug: string;
  units: { id: string; unitNumber: string; entrance: number; floor: number; ownerName: string | null }[];
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const unitId = fd.get("unitId") as string;
    try {
      await createTicketAction(slug, {
        unitId: unitId === "__yard__" ? null : (unitId || null),
        category: fd.get("category") as TicketCategory,
        priority: fd.get("priority") as TicketPriority,
        title: fd.get("title") as string,
        description: fd.get("description") as string,
      });
      toast.success("Заявка создана");
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
        <label className="block text-sm font-medium">Тема</label>
        <input name="title" required maxLength={500} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Категория</label>
          <select name="category" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Приоритет</label>
          <select name="priority" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Место</label>
        <select name="unitId" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <option value="__yard__">Двор / общая территория</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              Блок {u.entrance}, этаж {u.floor}, кв. {u.unitNumber}{u.ownerName ? ` — ${u.ownerName}` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-400">Выберите квартиру или общую территорию</p>
      </div>

      <div>
        <label className="block text-sm font-medium">Описание</label>
        <textarea name="description" required rows={4} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onDone} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Отмена</button>
        <button type="submit" disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
          {pending ? "Создание..." : "Создать заявку"}
        </button>
      </div>
    </form>
  );
}

export { CATEGORIES, PRIORITIES };
