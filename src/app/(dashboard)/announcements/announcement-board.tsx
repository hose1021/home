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
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";

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
  announcements,
  canManage,
}: {
  announcements: Announcement[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    await deleteAnnouncementAction(deleting);
    setDeleting(null);
  }

  return (
    <>
      {announcements.length === 0 ? (
        <div className="surface-panel flex flex-col items-center border-dashed px-6 py-16 text-center">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><IconBell className="size-5" /></span>
          <p className="mt-4 font-medium">Объявлений пока нет</p>
          <p className="mt-1 text-sm text-muted-foreground">Новые сообщения для жителей появятся здесь.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`surface-panel p-5 ${
                  a.priority === "urgent" ? "border-l-red-500" :
                      a.priority === "high" ? "border-l-amber-500" :
                          a.priority === "low" ? "border-l-muted-foreground" :
                              "border-l-blue-500"
              } border-l-4`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {a.isPinned && <IconPin className="size-4 shrink-0 text-zinc-400" />}
                    <h3 className="font-medium">{a.title}</h3>
                    {a.isDashboard && <Badge variant="outline">Дашборд</Badge>}
                    <Badge variant="secondary" className={
                      a.priority === "urgent" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" :
                      a.priority === "high" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200" :
                      a.priority === "low" ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-900" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                    }>
                      {priorityLabels[a.priority] ?? a.priority}
                    </Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{a.content}</p>
                </div>

                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(a)} aria-label="Редактировать объявление">
                      <IconEdit className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(a.id)} aria-label="Удалить объявление" className="text-muted-foreground hover:text-destructive">
                      <IconTrash className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
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
