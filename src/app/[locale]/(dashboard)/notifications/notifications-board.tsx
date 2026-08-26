"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {createNotificationAction, markNotificationReadAction} from "@/modules/notification/notification.actions";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean | null;
  sentAt: Date;
};

export function NotificationsBoard({ notifications, users, canSend }: {
  notifications: Notification[];
  users: { id: string; fullName: string }[];
  canSend: boolean;
}) {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);

  async function markRead(id: string) {
    try {
      await markNotificationReadAction(id);
      toast.success(t("markedRead"));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{notifications.length} {t("count")}</p>
        {canSend && <Button size="sm" onClick={() => setOpen(true)}>+ {t("create")}</Button>}
      </div>

      <div className="surface-panel divide-y overflow-hidden">
        {notifications.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">{t("emptyDescription")}</p>
        )}
        {notifications.map((n) => (
          <div key={n.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/25 sm:px-5">
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.isRead ? "bg-muted-foreground/30" : "bg-primary"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {n.type} · {new Date(n.sentAt).toLocaleString()}
              </p>
            </div>
            {!n.isRead && (
              <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>{t("markRead")}</Button>
            )}
          </div>
        ))}
      </div>

      {open && <NotificationDialog users={users} onClose={() => setOpen(false)} />}
    </div>
  );
}

function NotificationDialog({ users, onClose }: {
  users: { id: string; fullName: string }[];
  onClose: () => void;
}) {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !title.trim()) { toast.error(t("required")); return; }
    setPending(true);
    try {
      await createNotificationAction({
        userId,
        type: type.trim(),
        title: title.trim(),
        body: body.trim() || undefined,
        channel: "in_app",
      });
      toast.success(t("created"));
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("createTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="n-user">{t("recipient")}</Label>
            <select id="n-user" value={userId} onChange={(e) => setUserId(e.target.value)} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <option value="">—</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="n-type">{t("type")}</Label>
            <Input id="n-type" value={type} onChange={(e) => setType(e.target.value)} className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="n-title">{t("title")}</Label>
            <Input id="n-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="n-body">{tc("description")}</Label>
            <Textarea id="n-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="mt-1" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{tc("cancel")}</Button>
            <Button type="submit" disabled={pending}>{pending ? t("saving") : t("send")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
