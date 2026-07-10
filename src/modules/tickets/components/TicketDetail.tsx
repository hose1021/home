"use client";

import {useState} from "react";
import {toast} from "sonner";
import {
  changeTicketStatusAction,
  rejectTicketAction,
  addCommentAction,
  deleteTicketAction,
} from "../ticket.actions";
import type { TicketStatus } from "../ticket.service";
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, PRIORITY_LABELS } from "./TicketList";

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

export function TicketDetail({
  slug,
  ticket,
  comments,
  canManage,
  canComment,
  canDelete,
}: {
  slug: string;
  ticket: TicketDetailData;
  comments: Comment[];
  canManage: boolean;
  canComment: boolean;
  canDelete?: boolean;
}) {
  const [comment, setComment] = useState("");
  const [commentPending, setCommentPending] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const currentStatus = ticket.status as TicketStatus;

  async function handleStatusChange(newStatus: TicketStatus) {
    if (newStatus === "rejected") {
      setRejectOpen(true);
      return;
    }
    try {
      await changeTicketStatusAction(slug, ticket.id, newStatus);
      toast.success(`Статус: ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Укажите причину отклонения");
      return;
    }
    try {
      await rejectTicketAction(slug, ticket.id, rejectReason.trim());
      toast.success("Заявка отклонена");
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
      await addCommentAction(slug, ticket.id, comment.trim());
      setComment("");
      toast.success("Комментарий добавлен");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCommentPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Удалить заявку безвозвратно?")) return;
    try {
      await deleteTicketAction(slug, ticket.id);
      window.location.href = `/${slug}/tickets`;
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const transitions: { status: TicketStatus; label: string; className: string }[] = ([
    { status: "in_progress", label: "В работу", className: "border-zinc-300 hover:bg-purple-50 hover:border-purple-300 dark:border-zinc-700 dark:hover:bg-purple-950/30" },
    { status: "done", label: "Выполнено", className: "border-zinc-300 hover:bg-green-50 hover:border-green-300 dark:border-zinc-700 dark:hover:bg-green-950/30" },
    { status: "rejected", label: "Отклонить", className: "border-zinc-300 hover:bg-red-50 hover:border-red-300 dark:border-zinc-700 dark:hover:bg-red-950/30" },
    { status: "pending", label: "На обсуждение", className: "border-zinc-300 hover:bg-blue-50 hover:border-blue-300 dark:border-zinc-700 dark:hover:bg-blue-950/30" },
  ] as const).filter((t) => t.status !== currentStatus);

  return (
    <div className="space-y-6">
      <div>
        <a href={`/${slug}/tickets`} className="text-sm text-zinc-500 hover:text-zinc-700">← К списку</a>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
              <span>{CATEGORY_LABELS[ticket.category as keyof typeof CATEGORY_LABELS] ?? ticket.category}</span>
              <span>·</span>
              <span>Приоритет: {PRIORITY_LABELS[ticket.priority as keyof typeof PRIORITY_LABELS] ?? ticket.priority}</span>
              {ticket.unitNumber ? (
                <><span>·</span><span>Блок {ticket.entrance}, эт. {ticket.floor}, кв. {ticket.unitNumber}</span></>
              ) : (
                <><span>·</span><span>Двор / территория</span></>
              )}
              <span>·</span>
              <span>{new Date(ticket.createdAt).toLocaleDateString("ru")}</span>
            </div>
            {ticket.ownerName && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  Хозяин: {ticket.ownerName}{ticket.ownerPhone ? ` · ${ticket.ownerPhone}` : ""}
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  Заявку подал: {ticket.createdBy}
                </span>
              </div>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[currentStatus] ?? ""}`}>
            {STATUS_LABELS[currentStatus] ?? ticket.status}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-2 text-sm font-semibold">Описание</h2>
        <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{ticket.description}</p>
        {ticket.status === "rejected" && ticket.rejectionReason && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
            <h3 className="text-xs font-semibold text-red-700 dark:text-red-400">Причина отклонения</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-red-800 dark:text-red-200">{ticket.rejectionReason}</p>
          </div>
        )}
      </div>

      {canManage && (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-sm font-semibold">Управление</h2>
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <button
                key={t.status}
                onClick={() => handleStatusChange(t.status)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${t.className}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {rejectOpen && (
            <div className="mt-3 space-y-2 rounded-lg border border-red-200 p-3 dark:border-red-900">
              <label className="block text-sm font-medium text-red-700 dark:text-red-400">Причина отклонения</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Укажите причину отказа..."
                rows={3}
                required
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Отклонить
                </button>
                <button
                  onClick={() => { setRejectOpen(false); setRejectReason(""); }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {canDelete && (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700">Удалить заявку</button>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold">Комментарии ({comments.length})</h2>
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-medium text-zinc-600 dark:text-zinc-300">{c.authorName}</span>
                <div className="flex items-center gap-2">
                  {c.isInternal && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900 dark:text-amber-200">Внутренний</span>}
                  <span>{new Date(c.createdAt).toLocaleDateString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-zinc-400">Нет комментариев</p>}
        </div>

        {canComment && (
          <form onSubmit={handleComment} className="mt-4 space-y-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Добавить комментарий..."
              rows={2}
              className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="submit"
              disabled={commentPending || !comment.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {commentPending ? "..." : "Отправить"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
