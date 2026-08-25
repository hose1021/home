"use client";

import {useState} from "react";
import {createUnitAction} from "../unit.actions";
import {Button} from "@/components/ui/button";
import {useTranslations} from "next-intl";

export function UnitCreateForm({
  onDone,
}: {
  onDone: () => void;
}) {
  const tu = useTranslations("units");
  const tc = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await createUnitAction({
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

  const types: Array<"residential" | "commercial" | "parking" | "storage"> = ["residential", "commercial", "parking", "storage"];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">{tu("unitNumber")}</label>
          <input name="unitNumber" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </div>
        <div>
          <label className="block text-sm font-medium">{tu("floor")}</label>
          <input name="floor" type="number" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </div>
        <div>
          <label className="block text-sm font-medium">{tu("entrance")}</label>
          <input name="entrance" type="number" defaultValue={1} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </div>
        <div>
          <label className="block text-sm font-medium">{tu("type")}</label>
          <select name="type" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            {types.map((t) => <option key={t} value={t}>{tu(`types.${t}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">{tu("area")}</label>
          <input name="area" type="number" step="0.01" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onDone}>{tc("cancel")}</Button>
        <Button type="submit" disabled={pending}>{pending ? tc("create") + "..." : tc("create")}</Button>
      </div>
    </form>
  );
}
