"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { OwnerCreateForm } from "@/modules/owner/components/OwnerCreateForm";
import { OwnerEditForm } from "@/modules/owner/components/OwnerEditForm";
import { deleteOwnerAction } from "@/modules/owner/owner.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type OwnerRow = {
  id: string;
  userId: string | null;
  fullName: string;
  phone: string | null;
  username: string;
  roles: string[];
  unitCount: number;
};

export function OwnerTable({ slug, owners }: { slug: string; owners: OwnerRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<OwnerRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    await deleteOwnerAction(slug, deleteId);
    setDeleteId(null);
    toast("Собственник удалён");
  }

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button variant="secondary" onClick={() => setCreateOpen(true)}>
          + Добавить собственника
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">ФИО</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Роль</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Телефон</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Логин</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">Квартир</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {owners.map((o) => (
              <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="px-4 py-3 text-sm font-medium">
                  <Link href={`/${slug}/owners/${o.id}`} className="hover:underline">{o.fullName}</Link>
                </td>
                <td className="px-4 py-3 text-sm"><RoleBadge roles={o.roles} /></td>
                <td className="px-4 py-3 text-sm text-zinc-500">{o.phone ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{o.username}</td>
                <td className="px-4 py-3 text-right text-sm">{o.unitCount}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(o)}>Ред.</Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteId(o.id)}>Удалить</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {owners.length === 0 && <p className="p-4 text-sm text-zinc-400">Нет собственников</p>}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Добавить собственника</DialogTitle></DialogHeader>
          <OwnerCreateForm slug={slug} onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать собственника</DialogTitle></DialogHeader>
          {editing && <OwnerEditForm slug={slug} owner={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить собственника</AlertDialogTitle>
            <AlertDialogDescription>Вы уверены? Собственник будет помечен как удалённый.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RoleBadge({ roles }: { roles: string[] }) {
  if (roles.length === 0) return null;
  const colors: Record<string, string> = {
    admin: "admin",
    management_member: "management_member",
    commandant: "commandant",
    owner: "secondary",
  };
  const labels: Record<string, string> = {
    admin: "Админ",
    management_member: "Правление",
    commandant: "Председатель",
    owner: "Собственник",
  };
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <Badge variant={`${colors[r]}`} key={r} className={`${colors[r]}`}>{labels[r] ?? r}</Badge>
      ))}
    </div>
  );
}
