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
import {AnnouncementForm} from "@/modules/announcements/components/AnnouncementForm";
import {deleteAnnouncementAction} from "@/modules/announcements/announcement.actions";
import {IconBell, IconEdit, IconPin, IconTrash} from "@tabler/icons-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: string;
  isPinned: boolean;
  isDashboard: boolean;
  createdAt: Date;
  createdBy: string | null;
};

const priorityLabels: Record<string, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  urgent: "Срочный",
};

export function AnnouncementBoard({
  slug,
  announcements,
  canManage,
}: {
  slug: string;
  announcements: Announcement[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    await deleteAnnouncementAction(slug, deleting);
    setDeleting(null);
  }

  return (
    <>
      {announcements.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-zinc-400">
          <IconBell className="size-12" />
          <p className="text-sm">Нет объявлений</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`rounded-lg border p-4 bg-zinc-950 ${
                  a.priority === "urgent" ? "bg-red-100 border-l-red-900" :
                      a.priority === "high" ? " border-l-amber-900" :
                          a.priority === "low" ? " border-l-zinc-900" :
                              "border-l-blue-900"
              } border-l-4`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {a.isPinned && <IconPin className="size-4 shrink-0 text-zinc-400" />}
                    <h3 className="font-medium">{a.title}</h3>
                    {a.isDashboard && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">Дашборд</span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      a.priority === "urgent" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" :
                      a.priority === "high" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200" :
                      a.priority === "low" ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-900" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                    }`}>
                      {priorityLabels[a.priority] ?? a.priority}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{a.content}</p>
                </div>

                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => setEditing(a)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800">
                      <IconEdit className="size-4" />
                    </button>
                    <button onClick={() => setDeleting(a.id)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800">
                      <IconTrash className="size-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
                <span>{a.createdBy}</span>
                <span>·</span>
                <span>{new Date(a.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать объявление</DialogTitle></DialogHeader>
          {editing && (
            <AnnouncementForm
              slug={slug}
              announcement={editing}
              onDone={() => setEditing(null)}
            />          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить объявление?</AlertDialogTitle>
            <AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
