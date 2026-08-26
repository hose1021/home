"use client";

import {IconCalendarEvent} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {MeetingForm} from "@/modules/meeting/components/MeetingForm";
import {deleteMeetingAction} from "@/modules/meeting/meeting.actions";

type Agenda = { id: string; title: string; description: string | null; sortOrder: number };
type Meeting = {
  id: string;
  title: string;
  meetingType: string | null;
  meetingFormat: string | null;
  status: string | null;
  proposedDate: Date;
  actualDate: Date | null;
  location: string | null;
  agendas: Agenda[];
};

export function MeetingTable({ meetings, canManage }: { meetings: Meeting[]; canManage?: boolean }) {
  const tm = useTranslations("meetings");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    await deleteMeetingAction(deleteId);
    setDeleteId(null);
    toast(tm("statuses.cancelled"));
  }

  return (
    <>
      <div className="space-y-3">
        {meetings.map((m) => (
          <div key={m.id} className="surface-panel p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{m.title}</h3>
                  <Badge variant="secondary" className={
                    m.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                    m.status === "scheduled" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                    "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  }>{statusLabel(m.status, tm)}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(m.proposedDate).toLocaleDateString("ru")}
                  {m.location && ` • ${m.location}`}
                  {" • "}{meetingTypeLabel(m.meetingType, tm)}{" • "}{formatLabel(m.meetingFormat, tc)}
                </p>
                {m.agendas.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {m.agendas.map((a) => <li key={a.id} className="text-sm text-muted-foreground">• {a.title}</li>)}
                  </ul>
                )}
              </div>
              <div className="flex items-start gap-2 ml-4">
                {canManage && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>{tc("edit")}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(m.id)} className="text-destructive">{tc("cancel")}</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {meetings.length === 0 && <div className="surface-panel flex flex-col items-center border-dashed px-6 py-16 text-center"><IconCalendarEvent className="size-8 text-muted-foreground" /><p className="mt-3 font-medium">{tm("noMeetings")}</p><p className="mt-1 text-sm text-muted-foreground">{tm("description")}</p></div>}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tm("editMeeting")}</DialogTitle></DialogHeader>
          {editing && <MeetingForm meeting={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tm("statuses.cancelled")}</AlertDialogTitle>
            <AlertDialogDescription>{tm("statuses.cancelled")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{tc("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function statusLabel(s: string | null, tm: ReturnType<typeof useTranslations<"meetings">>) {
  const map: Record<string, string> = {
    scheduled: String(tm("statuses.planned")),
    completed: String(tm("statuses.completed")),
    cancelled: String(tm("statuses.cancelled")),
    in_progress: String(tm("statuses.in_progress")),
  };
  return map[s ?? ""] ?? s ?? "—";
}
function meetingTypeLabel(s: string | null, tm: ReturnType<typeof useTranslations<"meetings">>) {
  const map: Record<string, string> = {
    annual: String(tm("types.annual")),
    extraordinary: String(tm("types.extraordinary")),
  };
  return map[s ?? ""] ?? s ?? "—";
}
function formatLabel(s: string | null, tc: ReturnType<typeof useTranslations<"common">>) {
  const map: Record<string, string> = {
    in_person: String(tc("formatInPerson")),
    online: String(tc("formatOnline")),
    mixed: String(tc("formatMixed")),
  };
  return map[s ?? ""] ?? s ?? "—";
}
