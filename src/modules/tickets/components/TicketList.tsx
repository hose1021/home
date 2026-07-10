"use client";

import {useState} from "react";
import Link from "next/link";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {TicketCreateForm} from "./TicketCreateForm";
import type {TicketStatus, TicketCategory, TicketPriority} from "../ticket.service";

export type TicketListItem = {
  id: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  rejectionReason: string | null;
  createdAt: Date;
  unitNumber: string | null;
  entrance: number | null;
  floor: number | null;
  ownerName: string | null;
  ownerPhone: string | null;
  createdBy: string;
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: "На обсуждении",
  in_progress: "В процессе",
  rejected: "Отклонено",
  done: "Выполнено",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Низкий",
  medium: "Обычный",
  high: "Высокий",
  urgent: "Срочный",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  plumbing: "Сантехника",
  electrical: "Электрика",
  cleaning: "Уборка",
  structural: "Конструктив",
  elevator: "Лифт",
  pest_control: "Дезинсекция",
  yard: "Двор / территория",
  security: "Безопасность",
  other: "Другое",
};

export function TicketList({
  slug,
  tickets,
  canCreate,
  units,
}: {
  slug: string;
  tickets: TicketListItem[];
  canCreate: boolean;
  units: { id: string; unitNumber: string; entrance: number; floor: number; ownerName: string | null }[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Заявки</h1>
          <p className="text-sm text-zinc-500">{tickets.length} шт.</p>
        </div>
        {canCreate && (
          <button onClick={() => setCreateOpen(true)} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
            + Новая заявка
          </button>
        )}
      </div>

      <div className="space-y-3">
        {tickets.map((t) => (
          <Link
            key={t.id}
            href={`/${slug}/tickets/${t.id}`}
            className="block rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">{t.title}</h3>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span>{CATEGORY_LABELS[t.category]}</span>
                  <span>·</span>
                  <span>Приоритет: {PRIORITY_LABELS[t.priority]}</span>
                  {t.unitNumber ? (
                    <>
                      <span>·</span>
                      <span>Блок {t.entrance}, эт. {t.floor}, кв. {t.unitNumber}</span>
                    </>
                  ) : (
                    <>
                      <span>·</span>
                      <span>Двор</span>
                    </>
                  )}
                  {t.ownerName && (
                    <>
                      <span>·</span>
                      <span>{t.ownerName}{t.ownerPhone ? ` ${t.ownerPhone}` : ""}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{new Date(t.createdAt).toLocaleDateString("ru")}</span>
                </div>
                {t.status === "rejected" && t.rejectionReason && (
                  <p className="mt-1 text-xs text-red-600">Причина отказа: {t.rejectionReason}</p>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                {STATUS_LABELS[t.status]}
              </span>
            </div>
          </Link>
        ))}
        {tickets.length === 0 && (
          <p className="text-sm text-zinc-400">Нет заявок</p>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новая заявка</DialogTitle></DialogHeader>
          <TicketCreateForm slug={slug} units={units} onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, CATEGORY_LABELS };
