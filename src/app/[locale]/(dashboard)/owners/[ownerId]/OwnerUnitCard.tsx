"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {updateUnitAction} from "@/modules/unit/unit.actions";
import {removeUnitFromOwnerAction} from "@/modules/owner/owner.actions";

type UnitData = {
  id: string;
  unitNumber: string;
  entrance: number;
  floor: number;
  type: string;
  area: string;
};

export function OwnerUnitCard({
  ownerId,
  unit,
  canManage,
  children,
}: {
  ownerId: string;
  unit: UnitData;
  canManage: boolean;
  children: React.ReactNode;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateUnitAction(unit.id, {
        unitNumber: fd.get("unitNumber") as string,
        entrance: Number(fd.get("entrance")),
        floor: Number(fd.get("floor")),
        type: fd.get("type") as "residential" | "commercial" | "parking" | "storage" | "other",
        area: fd.get("area") as string,
      });
      setEditOpen(false);
      toast.success("Квартира обновлена");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    setPending(true);
    try {
      await removeUnitFromOwnerAction(ownerId, unit.id);
      setRemoveOpen(false);
      toast.success("Квартира отвязана");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="surface-panel overflow-hidden">
      {children}

      {canManage && (
        <div className="flex items-center gap-2 border-t px-5 py-2 sm:px-6">
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            Ред.
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRemoveOpen(true)}>
            Отвязать
          </Button>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать квартиру</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">№ квартиры</label>
                <input name="unitNumber" defaultValue={unit.unitNumber} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
              </div>
              <div>
                <label className="block text-sm font-medium">Этаж</label>
                <input name="floor" type="number" defaultValue={unit.floor} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
              </div>
              <div>
                <label className="block text-sm font-medium">Подъезд</label>
                <input name="entrance" type="number" defaultValue={unit.entrance} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
              </div>
              <div>
                <label className="block text-sm font-medium">Тип</label>
                <select name="type" defaultValue={unit.type} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <option value="residential">Жилая</option>
                  <option value="commercial">Коммерческая</option>
                  <option value="parking">Парковка</option>
                  <option value="storage">Склад</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Площадь (м²)</label>
                <input name="area" type="number" step="0.01" defaultValue={unit.area} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={pending}>{pending ? "Сохранение..." : "Сохранить"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отвязать квартиру</AlertDialogTitle>
            <AlertDialogDescription>
              Квартира №{unit.unitNumber} будет отвязана от собственника. Сама квартира не удаляется.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={pending}>
              {pending ? "Удаление..." : "Отвязать"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
