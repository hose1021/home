"use client";

import {useState} from "react";
import {createAnnouncementAction, updateAnnouncementAction} from "../announcement.actions";
import {Button} from "@/components/ui/button";

type AnnouncementData = {
  id: string;
  title: string;
  content: string;
  priority: string;
  isPinned: boolean;
  isDashboard: boolean;
};

export function AnnouncementForm({
  announcement,
  onDone,
}: {
  announcement?: AnnouncementData;
  onDone: () => void;
}) {
  const isEdit = !!announcement;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const data = {
        title: fd.get("title") as string,
        content: fd.get("content") as string,
        priority: (fd.get("priority") || "normal") as "low" | "normal" | "high" | "urgent",
        isPinned: fd.get("isPinned") === "on",
        isDashboard: fd.get("isDashboard") === "on",
      };

      if (isEdit) {
        await updateAnnouncementAction(announcement!.id, data);
      } else {
        await createAnnouncementAction(data);
      }
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
        <label className="block text-sm font-medium">Заголовок</label>
        <input name="title" defaultValue={announcement?.title} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </div>

      <div>
        <label className="block text-sm font-medium">Текст</label>
        <textarea name="content" defaultValue={announcement?.content} rows={5} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium">Приоритет</label>
          <select name="priority" defaultValue={announcement?.priority ?? "normal"} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <option value="low">Низкий</option>
            <option value="normal">Обычный</option>
            <option value="high">Высокий</option>
            <option value="urgent">Срочный</option>
          </select>
        </div>
        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input name="isPinned" type="checkbox" defaultChecked={announcement?.isPinned} className="rounded border-zinc-300 dark:border-zinc-700" />
            <span className="text-sm font-medium">Закрепить</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input name="isDashboard" type="checkbox" defaultChecked={announcement?.isDashboard} className="rounded border-zinc-300 dark:border-zinc-700" />
            <span className="text-sm font-medium">На дашборд</span>
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onDone}>Отмена</Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
        </Button>
      </div>
    </form>
  );
}
