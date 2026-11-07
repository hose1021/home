"use client";

import {IconBell, IconEdit, IconPin, IconTrash} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {useState} from "react";
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
import type {AnnouncementPriority} from "@/core/db/schema/enums";
import {deleteAnnouncementAction} from "@/modules/announcements/announcement.actions";
import {ANNOUNCEMENT_TONE} from "@/modules/announcements/announcement.constants";
import {AnnouncementForm} from "@/modules/announcements/components/AnnouncementForm";

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  isPinned: boolean;
  isDashboard: boolean;
  createdAt: Date;
  authorName: string | null;
};

export function AnnouncementBoard({
  announcements,
  canManage,
}: {
  announcements: Announcement[];
  canManage: boolean;
}) {
  const ta = useTranslations("announcements");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    await deleteAnnouncementAction(deleting);
    setDeleting(null);
  }

  function priorityLabel(p: AnnouncementPriority) { return ta(`priorities.${p}`); }

  return (
    <>
      {announcements.length === 0 ? (
        <div className="surface-panel flex flex-col items-center border-dashed px-6 py-16 text-center">
          <span className="flex size-10 items-center justify-center rounded-[4px] bg-muted text-muted-foreground"><IconBell className="size-5" /></span>
          <p className="mt-4 font-medium">{ta("noAnnouncements")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{ta("description")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`surface-panel border-l-4 p-5 ${ANNOUNCEMENT_TONE[a.priority].border}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {a.isPinned && <IconPin className="size-4 shrink-0 text-muted-foreground/70" />}
                    <h3 className="font-medium">{a.title}</h3>
                    {a.isDashboard && <Badge variant="outline">{ta("showOnDashboard")}</Badge>}
                    <Badge variant="secondary" className={ANNOUNCEMENT_TONE[a.priority].badge}>
                      {priorityLabel(a.priority)}
                    </Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{a.content}</p>
                </div>

                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(a)} aria-label={ta("edit")}>
                      <IconEdit className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(a.id)} aria-label={tc("delete")} className="text-muted-foreground hover:text-destructive">
                      <IconTrash className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{a.authorName}</span>
                <span>·</span>
                <span>{new Date(a.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ta("edit")}</DialogTitle></DialogHeader>
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
            <AlertDialogTitle>{tc("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{tc("confirmDelete")}</AlertDialogDescription>
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
