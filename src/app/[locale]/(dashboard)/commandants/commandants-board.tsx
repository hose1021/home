"use client";

import {useState} from "react";
import {toast} from "sonner";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {updateCommandantAction} from "@/modules/commandants/commandant.actions";
import {CommandantDialog, type CommandantRow, type OwnerOption} from "./commandant-dialog";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatPeriod(startDate: string, endDate: string | null): string {
  return `${startDate} — ${endDate ?? "по настоящее время"}`;
}

export function CommandantsBoard({
  commandants,
  owners,
}: {
  commandants: CommandantRow[];
  owners: OwnerOption[];
}) {
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
        endDate: today(),
      });
      toast.success("Период завершён");
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
      toast.success("Комендант активирован");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      {active.length === 0 && (
        <p className="text-sm text-muted-foreground">Комендант не назначен</p>
      )}

      {active.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((commandant) => (
            <div key={commandant.id} className="surface-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{commandant.fullName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{commandant.phone ?? "Нет телефона"}</p>
                </div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Активен</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{formatPeriod(commandant.startDate, commandant.endDate)}</p>
              {commandant.ownerId && <p className="mt-1 text-xs text-muted-foreground">Из собственников</p>}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(commandant)}>Изменить</Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => endTenure(commandant)}>Завершить период</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="text-base font-semibold">История</h2>
          <p className="mt-1 text-sm text-muted-foreground">Прошлые коменданты, включая собственников</p>
          <div className="surface-panel mt-3 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-4 py-2.5">Имя</th>
                  <th className="px-4 py-2.5">Телефон</th>
                  <th className="px-4 py-2.5">Период</th>
                  <th className="px-4 py-2.5">Статус</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {history.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium">
                      {row.fullName}
                      {row.ownerId && <span className="ml-2 text-xs text-muted-foreground">собственник</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatPeriod(row.startDate, row.endDate)}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">Завершён</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Изменить</Button>
                        <Button variant="ghost" size="sm" onClick={() => activate(row)}>Активировать</Button>
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
