"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {Link} from "@/i18n/navigation";
import {addCommentAction, changeTicketStatusAction, deleteTicketAction, rejectTicketAction,} from "../ticket.actions";
import type {TicketStatus} from "../ticket.service";

type Comment = {
  id: string;
  userId: string;
  content: string;
  isInternal: boolean | null;
  createdAt: Date;
  authorName: string;
};

type TicketDetailData = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  assignedToName: string | null;
  unitNumber: string | null;
  entrance: number | null;
  floor: number | null;
  ownerName: string | null;
  ownerPhone: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-primary/12 border-primary/35 text-primary",
  in_progress: "bg-gold/12 border-gold/35 text-gold",
  rejected: "bg-danger/12 border-danger/35 text-danger",
  done: "bg-success/12 border-success/35 text-success",
};

export function TicketDetail({
  ticket,
  comments,
  canManage,
  canComment,
  canDelete,
}: {
  ticket: TicketDetailData;
  comments: Comment[];
  canManage: boolean;
  canComment: boolean;
  canDelete?: boolean;
}) {
  const t = useTranslations("tickets");
  const tc = useTranslations("common");
  const td = useTranslations("dashboard");
  const tu = useTranslations("units");
  const [comment, setComment] = useState("");
  const [commentPending, setCommentPending] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const currentStatus = ticket.status as TicketStatus;

  function statusLabel(s: TicketStatus) { return t(`status.${s}`); }
  function categoryLabel(c: string) { return t(`categories.${c}` as Parameters<typeof t>[0]) ?? c; }
  function priorityLabel(p: string) { return t(`priorities.${p}` as Parameters<typeof t>[0]) ?? p; }
  function statusActionLabel(s: TicketStatus) { return t(`statusActions.${s}`); }

  async function handleStatusChange(newStatus: TicketStatus) {
    if (newStatus === "rejected") {
      setRejectOpen(true);
      return;
    }
    try {
      await changeTicketStatusAction(ticket.id, newStatus);
      toast.success(t("statusUpdated", {status: statusLabel(newStatus)}));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error(t("rejectionRequired"));
      return;
    }
    try {
      await rejectTicketAction(ticket.id, rejectReason.trim());
      toast.success(t("ticketRejected"));
      setRejectOpen(false);
      setRejectReason("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommentPending(true);
    try {
      await addCommentAction(ticket.id, comment.trim());
      setComment("");
      toast.success(t("commentAdded"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCommentPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await deleteTicketAction(ticket.id);
      window.location.href = `/tickets`;
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const transitions: { status: TicketStatus; label: string; className: string }[] = ([
    { status: "in_progress", label: statusActionLabel("in_progress"), className: "border-border hover:border-gold/45 hover:bg-gold/10 hover:text-gold" },
    { status: "done", label: statusActionLabel("done"), className: "border-border hover:border-success/45 hover:bg-success/10 hover:text-success" },
    { status: "rejected", label: statusActionLabel("rejected"), className: "border-border hover:border-danger/45 hover:bg-danger/10 hover:text-danger" },
    { status: "pending", label: statusActionLabel("pending"), className: "border-border hover:border-primary/45 hover:bg-primary/10 hover:text-primary" },
  ] as const).filter((tr) => tr.status !== currentStatus);

  return (
    <div className="page-shell">
      <div>
        <Link href="/tickets" className="text-sm text-muted-foreground hover:text-foreground">{tc("backToList")}</Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="page-heading">{ticket.title}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{categoryLabel(ticket.category)}</span>
              <span>·</span>
              <span>{t("priority")}: {priorityLabel(ticket.priority)}</span>
              {ticket.unitNumber ? (
                <><span>·</span><span>{td("block")} {ticket.entrance}, {tu("floor")} {ticket.floor}, {tu("unitNumber")} {ticket.unitNumber}</span></>
              ) : (
                <><span>·</span><span>{t("yardShort")}</span></>
              )}
              <span>·</span>
              <span>{new Date(ticket.createdAt).toLocaleDateString("ru")}</span>
            </div>
            {ticket.ownerName && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {t("applicant")}: {ticket.ownerName}{ticket.ownerPhone ? ` · ${ticket.ownerPhone}` : ""}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {t("createdBy")}: {ticket.createdBy}
                </span>
              </div>
            )}
          </div>
          <Badge className={`shrink-0 border-0 ${STATUS_COLORS[currentStatus] ?? ""}`}>
            {statusLabel(currentStatus)}
          </Badge>
        </div>
      </div>

      <div className="surface-panel p-5">
        <h2 className="mb-2 text-sm font-semibold">{tc("description")}</h2>
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{ticket.description}</p>
        {ticket.status === "rejected" && ticket.rejectionReason && (
          <div className="mt-4 rounded-[4px] bg-danger/10 p-3 dark:bg-danger/10">
            <h3 className="text-xs font-semibold text-danger">{t("rejectionReason")}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-danger/90">{ticket.rejectionReason}</p>
          </div>
        )}
      </div>

      {canManage && (
        <div className="surface-panel p-5">
          <h2 className="mb-3 text-sm font-semibold">{t("management")}</h2>
          <div className="flex flex-wrap gap-2">
            {transitions.map((tr) => (
              <Button
                key={tr.status}
                onClick={() => handleStatusChange(tr.status)}
                variant="outline"
                size="sm"
                className={tr.className}
              >
                {tr.label}
              </Button>
            ))}
          </div>

          {rejectOpen && (
            <div className="mt-3 space-y-2 rounded-[4px] border border-danger/40 p-3">
              <label className="block text-sm font-medium text-danger">{t("rejectionReason")}</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("rejectionReasonPlaceholder")}
                rows={3}
                required
                className="min-h-24"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  variant="destructive"
                >
                  {statusActionLabel("rejected")}
                </Button>
                <Button
                  onClick={() => { setRejectOpen(false); setRejectReason(""); }}
                  variant="outline"
                >
                  {tc("cancel")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {canDelete && (
        <div className="surface-panel p-4">
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive">{t("deleteTicket")}</Button>
        </div>
      )}

      <div className="surface-panel p-5">
        <h2 className="mb-3 text-sm font-semibold">{t("comments")} ({comments.length})</h2>
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-[4px] bg-muted/50 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                <span className="font-medium text-muted-foreground dark:text-foreground">{c.authorName}</span>
                <div className="flex items-center gap-2">
                  {c.isInternal && <span className="rounded-full bg-warning/12 border-warning/35 text-warning">{t("internalNote")}</span>}
                  <span>{new Date(c.createdAt).toLocaleDateString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-muted-foreground/70">{t("noComments")}</p>}
        </div>

        {canComment && (
          <form onSubmit={handleComment} className="mt-4 space-y-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("addCommentPlaceholder")}
              rows={2}
              className="min-h-20"
            />
            <Button
              type="submit"
              disabled={commentPending || !comment.trim()}
            >
              {commentPending ? "..." : t("send")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
