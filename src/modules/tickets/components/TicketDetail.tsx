"use client";

import {useState} from "react";
import {toast} from "sonner";
import {addCommentAction, changeTicketStatusAction, deleteTicketAction, rejectTicketAction,} from "../ticket.actions";
import type {TicketStatus} from "../ticket.service";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Textarea} from "@/components/ui/textarea";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";

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
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
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
    { status: "in_progress", label: statusActionLabel("in_progress"), className: "border-zinc-300 hover:bg-purple-50 hover:border-purple-300 dark:border-zinc-700 dark:hover:bg-purple-950/30" },
    { status: "done", label: statusActionLabel("done"), className: "border-zinc-300 hover:bg-green-50 hover:border-green-300 dark:border-zinc-700 dark:hover:bg-green-950/30" },
    { status: "rejected", label: statusActionLabel("rejected"), className: "border-zinc-300 hover:bg-red-50 hover:border-red-300 dark:border-zinc-700 dark:hover:bg-red-950/30" },
    { status: "pending", label: statusActionLabel("pending"), className: "border-zinc-300 hover:bg-blue-50 hover:border-blue-300 dark:border-zinc-700 dark:hover:bg-blue-950/30" },
  ] as const).filter((tr) => tr.status !== currentStatus);

  return (
    <div className="page-shell max-w-5xl">
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
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {t("applicant")}: {ticket.ownerName}{ticket.ownerPhone ? ` · ${ticket.ownerPhone}` : ""}
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
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
          <div className="mt-4 rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
            <h3 className="text-xs font-semibold text-red-700 dark:text-red-400">{t("rejectionReason")}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-red-800 dark:text-red-200">{ticket.rejectionReason}</p>
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
            <div className="mt-3 space-y-2 rounded-lg border border-red-200 p-3 dark:border-red-900">
              <label className="block text-sm font-medium text-red-700 dark:text-red-400">{t("rejectionReason")}</label>
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
            <div key={c.id} className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-medium text-zinc-600 dark:text-zinc-300">{c.authorName}</span>
                <div className="flex items-center gap-2">
                  {c.isInternal && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900 dark:text-amber-200">{t("internalNote")}</span>}
                  <span>{new Date(c.createdAt).toLocaleDateString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-zinc-400">{t("noComments")}</p>}
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
