"use client";

import {IconCalendar, IconChevronRight, IconMapPin, IconPlus, IconTicket} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Link} from "@/i18n/navigation";
import type {TicketCategory, TicketPriority, TicketStatus} from "../ticket.service";
import {TicketCreateForm} from "./TicketCreateForm";

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

const STATUS_COLORS: Record<TicketStatus, string> = {
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
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
  const t = useTranslations("tickets");
  const tc = useTranslations("common");
  const td = useTranslations("dashboard");
  const tu = useTranslations("units");
  const [createOpen, setCreateOpen] = useState(false);

  function statusLabel(s: TicketStatus) { return t(`status.${s}`); }
  function categoryLabel(c: TicketCategory) { return t(`categories.${c}`); }
  function priorityLabel(p: TicketPriority) { return t(`priorities.${p}`); }

  return (
    <>
      <div className="page-shell">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-muted-foreground">{t("serviceDesk")}</p>
            <h1 className="page-heading mt-1">{t("title")}</h1>
            <p className="page-description">{t("description")} · {tickets.length} {tc("pieces")}</p>
          </div>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <IconPlus /> {t("newTicket")}
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              className="surface-panel group block p-4 transition-colors hover:bg-muted/20 sm:p-5"
            >
              <div className="flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <IconTicket className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="font-semibold">{ticket.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">{categoryLabel(ticket.category)}</span>
                        <span className="flex items-center gap-1"><IconMapPin className="size-3.5" />{ticket.unitNumber ? `${td("block")} ${ticket.entrance}, ${tu("floor")} ${ticket.floor}, ${tu("unitNumber")} ${ticket.unitNumber}` : t("yardShort")}</span>
                        <span className="flex items-center gap-1"><IconCalendar className="size-3.5" />{new Date(ticket.createdAt).toLocaleDateString("ru")}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className={ticket.priority === "urgent" ? "border-red-200 text-red-600" : "text-muted-foreground"}>{priorityLabel(ticket.priority)}</Badge>
                      <Badge className={`border-0 ${STATUS_COLORS[ticket.status]}`}>{statusLabel(ticket.status)}</Badge>
                      <IconChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                  {ticket.ownerName && <p className="mt-3 text-xs text-muted-foreground">{t("applicant")}: {ticket.ownerName}{ticket.ownerPhone ? ` · ${ticket.ownerPhone}` : ""}</p>}
                  {ticket.status === "rejected" && ticket.rejectionReason && (
                    <p className="mt-3 rounded-lg bg-red-500/8 px-3 py-2 text-xs text-red-600">{t("rejectionReason")}: {ticket.rejectionReason}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {tickets.length === 0 && (
            <div className="surface-panel flex flex-col items-center px-6 py-16 text-center">
              <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><IconTicket className="size-5" /></span>
              <p className="mt-4 font-semibold">{t("noTickets")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("noTicketsDesc")}</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("newTicket")}</DialogTitle></DialogHeader>
          <TicketCreateForm units={units} onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export { STATUS_COLORS };
