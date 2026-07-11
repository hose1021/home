"use client";

import {useState} from "react";
import Link from "next/link";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {TicketCreateForm} from "./TicketCreateForm";
import type {TicketCategory, TicketPriority, TicketStatus} from "../ticket.service";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {IconCalendar, IconChevronRight, IconMapPin, IconPlus, IconTicket} from "@tabler/icons-react";

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
  tickets,
  canCreate,
  units,
}: {
  tickets: TicketListItem[];
  canCreate: boolean;
  units: { id: string; unitNumber: string; entrance: number; floor: number; ownerName: string | null }[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div className="page-shell">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-muted-foreground">Сервисная служба</p>
            <h1 className="page-heading mt-1">Заявки</h1>
            <p className="page-description">Обсуждение и контроль выполнения обращений · {tickets.length} шт.</p>
          </div>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <IconPlus /> Новая заявка
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="surface-panel group block p-4 transition-colors hover:bg-muted/20 sm:p-5"
            >
              <div className="flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <IconTicket className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="font-semibold">{t.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">{CATEGORY_LABELS[t.category]}</span>
                        <span className="flex items-center gap-1"><IconMapPin className="size-3.5" />{t.unitNumber ? `Блок ${t.entrance}, эт. ${t.floor}, кв. ${t.unitNumber}` : "Двор / территория"}</span>
                        <span className="flex items-center gap-1"><IconCalendar className="size-3.5" />{new Date(t.createdAt).toLocaleDateString("ru")}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className={t.priority === "urgent" ? "border-red-200 text-red-600" : "text-muted-foreground"}>{PRIORITY_LABELS[t.priority]}</Badge>
                      <Badge className={`border-0 ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</Badge>
                      <IconChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                  {t.ownerName && <p className="mt-3 text-xs text-muted-foreground">Заявитель: {t.ownerName}{t.ownerPhone ? ` · ${t.ownerPhone}` : ""}</p>}
                  {t.status === "rejected" && t.rejectionReason && (
                    <p className="mt-3 rounded-lg bg-red-500/8 px-3 py-2 text-xs text-red-600">Причина отказа: {t.rejectionReason}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {tickets.length === 0 && (
            <div className="surface-panel flex flex-col items-center px-6 py-16 text-center">
              <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><IconTicket className="size-5" /></span>
              <p className="mt-4 font-semibold">Заявок пока нет</p>
              <p className="mt-1 text-sm text-muted-foreground">Новые обращения появятся здесь.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новая заявка</DialogTitle></DialogHeader>
          <TicketCreateForm units={units} onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, CATEGORY_LABELS };
