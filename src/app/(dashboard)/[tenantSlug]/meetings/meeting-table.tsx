"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
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
import {toast} from "sonner";
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

export function MeetingTable({ slug, meetings, canManage }: { slug: string; meetings: Meeting[]; canManage?: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    await deleteMeetingAction(slug, deleteId);
    setDeleteId(null);
    toast("Собрание отменено");
  }

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        {canManage && (
          <button onClick={() => setCreateOpen(true)} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
            + Создать собрание
          </button>
        )}
      </div>

      <div className="space-y-3">
        {meetings.map((m) => (
          <div key={m.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{m.title}</h3>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                    m.status === "scheduled" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                    "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  }`}>{statusLabel(m.status)}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  {new Date(m.proposedDate).toLocaleDateString("ru")}
                  {m.location && ` • ${m.location}`}
                  {" • "}{meetingTypeLabel(m.meetingType)}{" • "}{formatLabel(m.meetingFormat)}
                </p>
                {m.agendas.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {m.agendas.map((a) => <li key={a.id} className="text-sm text-zinc-500">• {a.title}</li>)}
                  </ul>
                )}
              </div>
              <div className="flex items-start gap-2 ml-4">
                {canManage && (
                  <>
                    <button onClick={() => setEditing(m)} className="text-xs text-zinc-500 hover:text-zinc-700">Ред.</button>
                    <button onClick={() => setDeleteId(m.id)} className="text-xs text-red-500 hover:text-red-700">Отменить</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {meetings.length === 0 && <p className="text-sm text-zinc-400">Нет собраний</p>}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Создать собрание</DialogTitle></DialogHeader>
          <MeetingForm slug={slug} onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать собрание</DialogTitle></DialogHeader>
          {editing && <MeetingForm slug={slug} meeting={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить собрание</AlertDialogTitle>
            <AlertDialogDescription>Статус собрания будет изменён на «отменено».</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Отменить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function statusLabel(s: string | null) {
  const map: Record<string, string> = { scheduled: "Запланировано", completed: "Проведено", cancelled: "Отменено", in_progress: "В процессе" };
  return map[s ?? ""] ?? s ?? "—";
}
function meetingTypeLabel(s: string | null) {
  const map: Record<string, string> = { annual: "Годовое", extraordinary: "Внеочередное", board: "Правление", audit: "Ревизия" };
  return map[s ?? ""] ?? s ?? "—";
}
function formatLabel(s: string | null) {
  const map: Record<string, string> = { in_person: "Очно", online: "Онлайн", mixed: "Смешанно" };
  return map[s ?? ""] ?? s ?? "—";
}
