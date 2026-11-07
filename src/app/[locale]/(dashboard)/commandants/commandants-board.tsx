"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {todayIso} from "@/lib/date";
import {updateCommandantAction} from "@/modules/commandants/commandant.actions";
import {CommandantDialog, type CommandantRow, type OwnerOption} from "./commandant-dialog";

export function CommandantsBoard({
  commandants,
  owners,
}: {
  commandants: CommandantRow[];
  owners: OwnerOption[];
}) {
  const t = useTranslations("commandants");
  const tc = useTranslations("common");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CommandantRow | null>(null);

  const active = commandants.filter((c) => c.isActive);
  const history = commandants.filter((c) => !c.isActive);

  function openEdit(row: CommandantRow) {
    setEditing(row);
    setEditOpen(true);
  }

  async function endTenure(row: CommandantRow) {
    try {
      await updateCommandantAction(row.id, {
        ownerId: row.ownerId,
        fullName: row.fullName,
        phone: row.phone,
        isActive: false,
        startDate: row.startDate,
        endDate: todayIso(),
      });
      toast.success(t("tenureEnded"));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function activate(row: CommandantRow) {
    try {
      await updateCommandantAction(row.id, {
        ownerId: row.ownerId,
        fullName: row.fullName,
        phone: row.phone,
        isActive: true,
        startDate: row.startDate,
        endDate: null,
      });
      toast.success(t("activated"));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      {active.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      )}

      {active.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((commandant) => (
            <div key={commandant.id} className="surface-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{commandant.fullName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{commandant.phone ?? t("noPhone")}</p>
                </div>
                <Badge className="bg-success/12 border-success/35 text-success">{t("active")}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{commandant.startDate} — {commandant.endDate ?? t("untilNow")}</p>
              {commandant.ownerId && <p className="mt-1 text-xs text-muted-foreground">{t("ownerBadge")}</p>}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(commandant)}>{t("edit")}</Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => endTenure(commandant)}>{t("endTenure")}</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="text-base font-semibold">{t("history")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("historyDescription")}</p>
          <div className="surface-panel mt-3 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-4 py-2.5">{t("name")}</th>
                  <th className="px-4 py-2.5">{t("phone")}</th>
                  <th className="px-4 py-2.5">{tc("period")}</th>
                  <th className="px-4 py-2.5">{tc("status")}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {history.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium">
                      {row.fullName}
                      {row.ownerId && <span className="ml-2 text-xs text-muted-foreground">{t("owner")}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.startDate} — {row.endDate ?? t("untilNow")}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{t("ended")}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>{t("edit")}</Button>
                        <Button variant="ghost" size="sm" onClick={() => activate(row)}>{t("activate")}</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <CommandantDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        owners={owners}
        initial={editing}
        onSaved={() => {
          setEditing(null);
          setEditOpen(false);
        }}
      />
    </div>
  );
}
