"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Textarea} from "@/components/ui/textarea";
import {createWorkOrderAction, updateWorkOrderStatusAction} from "@/modules/work-order/work-order.actions";

type Order = {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "approved" | "in_progress" | "completed" | "cancelled";
  estimatedCost: string | null;
  scheduledDate: Date | null;
  contractorName: string | null;
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  in_progress: "outline",
  completed: "default",
  cancelled: "destructive",
};

export function WorkOrdersBoard({ orders, contractors, canManage }: {
  orders: Order[];
  contractors: { id: string; name: string }[];
  canManage: boolean;
}) {
  const t = useTranslations("workOrders");
  const [open, setOpen] = useState(false);

  async function setStatus(id: string, status: Order["status"]) {
    try {
      await updateWorkOrderStatusAction(id, status);
      toast.success(t("updated"));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{orders.length} {t("count")}</p>
        {canManage && <Button size="sm" onClick={() => setOpen(true)}>+ {t("create")}</Button>}
      </div>

      <div className="surface-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("contractor")}</TableHead>
              <TableHead className="text-right">{t("estimatedCost")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              {canManage && <TableHead className="w-[140px] text-right">{t("actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="py-10 text-center text-sm text-muted-foreground">
                  {t("emptyDescription")}
                </TableCell>
              </TableRow>
            )}
            {orders.map((o) => (
              <TableRow key={o.id} className="hover:bg-muted/50">
                <TableCell>
                  <p className="font-medium">{o.title}</p>
                  {o.description && <p className="text-xs text-muted-foreground">{o.description}</p>}
                </TableCell>
                <TableCell>{o.contractorName ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{o.estimatedCost ? `${Number(o.estimatedCost).toFixed(2)} ₼` : "—"}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANTS[o.status] ?? "secondary"}>{t(`statuses.${o.status}`)}</Badge></TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <select
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value as Order["status"])}
                      className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                    >
                      {(["pending", "approved", "in_progress", "completed", "cancelled"] as const).map((s) => (
                        <option key={s} value={s}>{t(`statuses.${s}`)}</option>
                      ))}
                    </select>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {open && <WorkOrderDialog contractors={contractors} onClose={() => setOpen(false)} />}
    </div>
  );
}

function WorkOrderDialog({ contractors, onClose }: {
  contractors: { id: string; name: string }[];
  onClose: () => void;
}) {
  const t = useTranslations("workOrders");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error(t("titleRequired")); return; }
    setPending(true);
    try {
      await createWorkOrderAction({
        title: title.trim(),
        description: description.trim() || undefined,
        contractorId: contractorId || undefined,
        estimatedCost: estimatedCost || undefined,
        scheduledDate: scheduledDate || undefined,
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
            <Label htmlFor="wo-title">{t("name")}</Label>
            <Input id="wo-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="wo-desc">{tc("description")}</Label>
            <Textarea id="wo-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wo-contractor">{t("contractor")}</Label>
              <select id="wo-contractor" value={contractorId} onChange={(e) => setContractorId(e.target.value)} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                <option value="">—</option>
                {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="wo-cost">{t("estimatedCost")}</Label>
              <Input id="wo-cost" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} type="number" step="0.01" min="0" className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="wo-date">{t("scheduledDate")}</Label>
            <Input id="wo-date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} type="date" className="mt-1" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{tc("cancel")}</Button>
            <Button type="submit" disabled={pending}>{pending ? t("saving") : tc("create")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
