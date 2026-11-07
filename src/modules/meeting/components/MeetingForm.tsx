"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {MEETING_TYPES, type MeetingFormat, type MeetingType} from "@/core/db/schema/enums";
import {createMeetingAction, updateMeetingAction} from "../meeting.actions";
import {MEETING_FORMAT_KEYS} from "../meeting.constants";

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
  meeting,
  onDone,
}: {
  meeting?: MeetingData;
  onDone: () => void;
}) {
  const tm = useTranslations("meetings");
  const tc = useTranslations("common");
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
        meetingType: fd.get("meetingType") as MeetingType,
        meetingFormat: fd.get("meetingFormat") as MeetingFormat,
        proposedDate: fd.get("proposedDate") as string,
        location: (fd.get("location") as string) || undefined,
        agendas: agendas.filter(Boolean).map((title, i) => ({ title, sortOrder: i + 1 })),
      };

      if (isEdit) {
        await updateMeetingAction(meeting.id, data);
      } else {
        await createMeetingAction(data);
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
        <label className="block text-sm font-medium">{tm("name")}</label>
        <input name="title" defaultValue={meeting?.title} required className="mt-1 field" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">{tm("type")}</label>
          <select name="meetingType" defaultValue={meeting?.meetingType ?? "annual"} className="mt-1 field">
            {MEETING_TYPES.map((type) => (
              <option key={type} value={type}>{tm(`types.${type}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">{tc("format")}</label>
          <select name="meetingFormat" defaultValue={meeting?.meetingFormat ?? "in_person"} className="mt-1 field">
            {Object.entries(MEETING_FORMAT_KEYS).map(([format, key]) => (
              <option key={format} value={format}>{tc(key)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">{tc("date")}</label>
          <input name="proposedDate" type="date" defaultValue={meeting ? new Date(meeting.proposedDate).toISOString().slice(0, 10) : undefined} required className="mt-1 field" />
        </div>
        <div>
          <label className="block text-sm font-medium">{tc("location")}</label>
          <input name="location" defaultValue={meeting?.location ?? ""} className="mt-1 field" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">{tm("agenda")}</label>
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
                placeholder={`${tm("agenda")} ${i + 1}`}
                className="field"
              />
              {agendas.length > 1 && (
                <button type="button" onClick={() => setAgendas(agendas.filter((_, j) => j !== i))} className="px-2 text-sm text-danger transition-opacity hover:opacity-70">×</button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAgendas([...agendas, ""])} className="mt-2">+ {tc("addItem")}</Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onDone}>{tc("cancel")}</Button>
        <Button type="submit" disabled={pending}>
          {pending ? tc("save") + "..." : isEdit ? tc("save") : tc("create")}
        </Button>
      </div>
    </form>
  );
}
