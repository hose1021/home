"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type HistoryEntry = {
  id: string;
  action: string;
  entityType: string;
  oldValues: unknown;
  newValues: unknown;
  createdAt: Date;
  userName: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  create: "Создание",
  update: "Изменение",
  delete: "Удаление",
};

const ENTITY_LABELS: Record<string, string> = {
  budget: "Бюджет",
  budget_item: "Статья",
};

function formatValues(values: unknown): string {
  if (!values || typeof values !== "object") return "—";
  const entries = Object.entries(values as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      if (k === "plannedAmount" || k === "amount") return `${Number(v).toFixed(2)} ₼`;
      if (k === "status") return String(v);
      if (k === "accountCode") return String(v);
      if (k === "notes") return `«${v}»`;
      if (k === "year") return `${v}`;
      return `${k}: ${v}`;
    });
  return entries.join(", ") || "—";
}

export function BudgetHistory({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">История изменений</h2>
        <p className="mt-1 text-sm text-muted-foreground">Последние 30 операций с бюджетом</p>
      </div>
      <div className="surface-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Дата</TableHead>
              <TableHead className="w-[100px]">Действие</TableHead>
              <TableHead className="w-[100px]">Объект</TableHead>
              <TableHead className="w-[140px]">Пользователь</TableHead>
              <TableHead>Было</TableHead>
              <TableHead>Стало</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry) => (
              <TableRow key={entry.id} className="text-sm">
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("ru-RU")}
                </TableCell>
                <TableCell>{ACTION_LABELS[entry.action] ?? entry.action}</TableCell>
                <TableCell>{ENTITY_LABELS[entry.entityType] ?? entry.entityType}</TableCell>
                <TableCell className="text-muted-foreground">{entry.userName ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatValues(entry.oldValues)}</TableCell>
                <TableCell className="text-xs">{formatValues(entry.newValues)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
