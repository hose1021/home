"use client";

import {useMemo, useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
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
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {IconSearch, IconX} from "@tabler/icons-react";
import {createUnitAction, updateUnitAction, deleteUnitAction, listOwnersAction} from "@/modules/unit/unit.actions";
import {assignExistingUnitAction, removeUnitFromOwnerAction} from "@/modules/owner/owner.actions";

const TYPE_LABELS: Record<string, string> = {
  residential: "Жилая",
  commercial: "Коммерческая",
  parking: "Парковка",
  storage: "Склад",
  other: "Другое",
};

const TYPE_OPTIONS = [
  { value: "", label: "Все типы" },
  { value: "residential", label: "Жилая" },
  { value: "commercial", label: "Коммерческая" },
  { value: "parking", label: "Парковка" },
  { value: "storage", label: "Склад" },
  { value: "other", label: "Другое" },
];

const OWNER_OPTIONS = [
  { value: "", label: "Все" },
  { value: "assigned", label: "С собственником" },
  { value: "unassigned", label: "Без собственника" },
];

type UnitRow = {
  id: string;
  unitNumber: string;
  entrance: number;
  floor: number;
  type: string;
  area: string;
  status: string | null;
  ownerIds: string[];
  ownerNames: string[];
  ownerCount: number;
};

type OwnerOption = { id: string; fullName: string };

export function UnitsTable({
  units,
  canManage,
}: {
  units: UnitRow[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<UnitRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignUnit, setAssignUnit] = useState<UnitRow | null>(null);
  const [detachUnit, setDetachUnit] = useState<UnitRow | null>(null);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [pending, setPending] = useState(false);

  async function loadOwners() {
    try {
      setOwners(await listOwnersAction());
    } catch {
      // ignore
    }
  }

  function openAssign(unit: UnitRow) {
    setAssignUnit(unit);
    loadOwners();
  }

  const filtered = useMemo(() => {
    let list = units;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((u) =>
        u.unitNumber.toLowerCase().includes(q) ||
        u.ownerNames.some((n) => n.toLowerCase().includes(q))
      );
    }
    if (typeFilter) {
      list = list.filter((u) => u.type === typeFilter);
    }
    if (ownerFilter === "assigned") {
      list = list.filter((u) => u.ownerCount > 0);
    } else if (ownerFilter === "unassigned") {
      list = list.filter((u) => u.ownerCount === 0);
    }
    return list;
  }, [units, search, typeFilter, ownerFilter]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createUnitAction({
        unitNumber: fd.get("unitNumber") as string,
        entrance: Number(fd.get("entrance")),
        floor: Number(fd.get("floor")),
        type: fd.get("type") as "residential" | "commercial" | "parking" | "storage" | "other",
        area: fd.get("area") as string,
      });
      setCreateOpen(false);
      toast.success("Квартира создана");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editUnit) return;
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateUnitAction(editUnit.id, {
        unitNumber: fd.get("unitNumber") as string,
        entrance: Number(fd.get("entrance")),
        floor: Number(fd.get("floor")),
        type: fd.get("type") as "residential" | "commercial" | "parking" | "storage" | "other",
        area: fd.get("area") as string,
      });
      setEditUnit(null);
      toast.success("Квартира обновлена");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setPending(true);
    try {
      await deleteUnitAction(deleteId);
      setDeleteId(null);
      toast.success("Квартира удалена");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!assignUnit || !selectedOwnerId) return;
    setPending(true);
    try {
      await assignExistingUnitAction(selectedOwnerId, assignUnit.id);
      setAssignUnit(null);
      setSelectedOwnerId("");
      toast.success("Квартира привязана");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleDetach() {
    if (!detachUnit) return;
    const ownerId = detachUnit.ownerIds[0];
    if (!ownerId) return;
    setPending(true);
    try {
      await removeUnitFromOwnerAction(ownerId, detachUnit.id);
      setDetachUnit(null);
      toast.success("Квартира отвязана");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  const unitFormFields = (defaults?: UnitRow) => (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label htmlFor="unitNumber">№ квартиры</Label>
        <Input id="unitNumber" name="unitNumber" defaultValue={defaults?.unitNumber ?? ""} required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="floor">Этаж</Label>
        <Input id="floor" name="floor" type="number" defaultValue={defaults?.floor ?? ""} required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="entrance">Подъезд</Label>
        <Input id="entrance" name="entrance" type="number" defaultValue={defaults?.entrance ?? 1} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="type">Тип</Label>
        <select name="type" defaultValue={defaults?.type ?? "residential"} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <option value="residential">Жилая</option>
          <option value="commercial">Коммерческая</option>
          <option value="parking">Парковка</option>
          <option value="storage">Склад</option>
        </select>
      </div>
      <div>
        <Label htmlFor="area">Площадь (м²)</Label>
        <Input id="area" name="area" type="number" step="0.01" defaultValue={defaults?.area ?? ""} required className="mt-1" />
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по номеру или собственнику..."
              className="h-9 w-64 pl-9 pr-8"
            />
            {search && (
              <button type="button" aria-label="Очистить поиск" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                <IconX className="size-4" />
              </button>
            )}
          </div>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
            {TYPE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>

          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
            {OWNER_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </div>

        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            + Добавить квартиру
          </Button>
        )}
      </div>

      <div className="surface-panel overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">№</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Подъезд</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Этаж</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Тип</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">Площадь</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Собственники</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-muted/50">
                <td className="px-4 py-3 text-sm font-medium">{u.unitNumber}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{u.entrance}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{u.floor}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge variant="secondary">{TYPE_LABELS[u.type] ?? u.type}</Badge>
                </td>
                <td className="px-4 py-3 text-right text-sm">{Number(u.area).toFixed(1)} м²</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {u.ownerNames.length > 0 ? u.ownerNames.join(", ") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {canManage && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditUnit(u); }}>
                        Ред.
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAssign(u)}>
                        Привязать
                      </Button>
                      {u.ownerCount > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setDetachUnit(u)}>
                          Отвязать
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => setDeleteId(u.id)}>
                        Удалить
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Нет квартир</p>}
      </div>
      <p className="text-sm text-muted-foreground">Показано: {filtered.length} из {units.length}</p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Добавить квартиру</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {unitFormFields()}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={pending}>{pending ? "Создание..." : "Создать"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUnit} onOpenChange={(o) => { if (!o) setEditUnit(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать квартиру</DialogTitle></DialogHeader>
          {editUnit && (
            <form onSubmit={handleEdit} className="space-y-4">
              {unitFormFields(editUnit)}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditUnit(null)}>Отмена</Button>
                <Button type="submit" disabled={pending}>{pending ? "Сохранение..." : "Сохранить"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignUnit} onOpenChange={(o) => { if (!o) { setAssignUnit(null); setSelectedOwnerId(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Привязать квартиру к собственнику</DialogTitle></DialogHeader>
          {assignUnit && (
            <form onSubmit={handleAssign} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Кв. {assignUnit.unitNumber}, под. {assignUnit.entrance}, эт. {assignUnit.floor}
              </p>
              <div>
                <Label htmlFor="owner">Собственник</Label>
                <select
                  id="owner"
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="">— Выберите —</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>{o.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setAssignUnit(null); setSelectedOwnerId(""); }}>Отмена</Button>
                <Button type="submit" disabled={pending || !selectedOwnerId}>{pending ? "Привязка..." : "Привязать"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!detachUnit} onOpenChange={(o) => { if (!o) setDetachUnit(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отвязать квартиру</AlertDialogTitle>
            <AlertDialogDescription>
              {detachUnit && (
                <>Кв. {detachUnit.unitNumber}, под. {detachUnit.entrance}, эт. {detachUnit.floor} — собственник {detachUnit.ownerNames[0]} будет отвязан.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDetach} disabled={pending}>{pending ? "Отвязка..." : "Отвязать"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить квартиру</AlertDialogTitle>
            <AlertDialogDescription>Квартира будет помечена как удалённая.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={pending}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
