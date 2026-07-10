"use client";

import {useState} from "react";
import {createMeetingAction, updateMeetingAction} from "../meeting.actions";

type MeetingData = {
  id: string;
  title: string;
  meetingType: string | null;
  meetingFormat: string | null;
  proposedDate: Date;
  location: string | null;
  agendas: { title: string }[];
};

export function MeetingForm({
  slug,
  meeting,
  onDone,
}: {
  slug: string;
  meeting?: MeetingData;
  onDone: () => void;
}) {
  const isEdit = !!meeting;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [agendas, setAgendas] = useState<string[]>(
    meeting ? meeting.agendas.map((a) => a.title) : [""],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const data = {
        title: fd.get("title") as string,
        meetingType: fd.get("meetingType") as "annual" | "extraordinary" | "board" | "audit",
        meetingFormat: fd.get("meetingFormat") as "in_person" | "online" | "mixed",
        proposedDate: fd.get("proposedDate") as string,
        location: (fd.get("location") as string) || undefined,
        agendas: agendas.filter(Boolean).map((title, i) => ({ title, sortOrder: i + 1 })),
      };

      if (isEdit) {
        await updateMeetingAction(slug, meeting.id, data);
      } else {
        await createMeetingAction(slug, data);
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
        <label className="block text-sm font-medium">Название</label>
        <input name="title" defaultValue={meeting?.title} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Тип</label>
          <select name="meetingType" defaultValue={meeting?.meetingType ?? "annual"} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <option value="annual">Годовое</option>
            <option value="extraordinary">Внеочередное</option>
            <option value="board">Правление</option>
            <option value="audit">Ревизия</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Формат</label>
          <select name="meetingFormat" defaultValue={meeting?.meetingFormat ?? "in_person"} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <option value="in_person">Очно</option>
            <option value="online">Онлайн</option>
            <option value="mixed">Смешанно</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Дата</label>
          <input name="proposedDate" type="date" defaultValue={meeting ? new Date(meeting.proposedDate).toISOString().slice(0, 10) : undefined} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </div>
        <div>
          <label className="block text-sm font-medium">Место</label>
          <input name="location" defaultValue={meeting?.location ?? ""} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Повестка дня</label>
        <div className="mt-1 space-y-2">
          {agendas.map((_, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={agendas[i]}
                onChange={(e) => {
                  const next = [...agendas];
                  next[i] = e.target.value;
                  setAgendas(next);
                }}
                placeholder={`Пункт ${i + 1}`}
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              {agendas.length > 1 && (
                <button type="button" onClick={() => setAgendas(agendas.filter((_, j) => j !== i))} className="text-sm text-red-500 hover:text-red-700">×</button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setAgendas([...agendas, ""])} className="mt-2 text-xs text-zinc-500 hover:text-zinc-700">+ Добавить пункт</button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onDone} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Отмена</button>
        <button type="submit" disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
          {pending ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
        </button>
      </div>
    </form>
  );
}
