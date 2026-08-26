"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {createTicketAction} from "../ticket.actions";
import type {TicketCategory, TicketPriority} from "../ticket.service";

export function TicketCreateForm({
  units,
  onDone,
}: {
  units: { id: string; unitNumber: string; entrance: number; floor: number; ownerName: string | null }[];
  onDone: () => void;
}) {
  const t = useTranslations("tickets");
  const tc = useTranslations("common");
  const td = useTranslations("dashboard");
  const tu = useTranslations("units");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function categoryLabel(c: TicketCategory) { return t(`categories.${c}`); }
  function priorityLabel(p: TicketPriority) { return t(`priorities.${p}`); }

  const categories: TicketCategory[] = ["plumbing", "electrical", "cleaning", "structural", "elevator", "pest_control", "yard", "security", "other"];
  const priorities: TicketPriority[] = ["low", "medium", "high", "urgent"];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const unitId = fd.get("unitId") as string;
    try {
      await createTicketAction({
        unitId: unitId === "__yard__" ? null : (unitId || null),
        category: fd.get("category") as TicketCategory,
        priority: fd.get("priority") as TicketPriority,
        title: fd.get("title") as string,
        description: fd.get("description") as string,
      });
      toast.success(tc("create") + "...");
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
        <label className="block text-sm font-medium">{t("subject")}</label>
        <input name="title" required maxLength={500} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">{t("category")}</label>
          <select name="category" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            {categories.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">{t("priority")}</label>
          <select name="priority" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            {priorities.map((p) => <option key={p} value={p}>{priorityLabel(p)}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">{t("location")}</label>
        <select name="unitId" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <option value="__yard__">{t("yard")}</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {td("block")} {u.entrance}, {tu("floor")} {u.floor}, {tu("unitNumber")} {u.unitNumber}{u.ownerName ? ` — ${u.ownerName}` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-400">{t("selectUnit")}</p>
      </div>

      <div>
        <label className="block text-sm font-medium">{tc("description")}</label>
        <textarea name="description" required rows={4} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onDone}>{tc("cancel")}</Button>
        <Button type="submit" disabled={pending}>
          {pending ? t("creating") : t("createTicket")}
        </Button>
      </div>
    </form>
  );
}
