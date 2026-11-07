"use client";

import {IconSearch, IconX} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {useMemo, useState} from "react";
import {toast} from "sonner";
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
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {UNIT_TYPES, type UnitType} from "@/core/db/schema/enums";
import {formatNumber} from "@/modules/finance/money-format";
import {assignExistingUnitAction, listOwnersAction, removeUnitFromOwnerAction} from "@/modules/owner/owner.actions";
import {createUnitAction, deleteUnitAction, updateUnitAction} from "@/modules/unit/unit.actions";

const OWNER_FILTERS = ["all", "assigned", "unassigned"] as const;
type OwnerFilter = (typeof OWNER_FILTERS)[number];

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
  const t = useTranslations("units");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");

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
    } catch (error) {
      toast.error((error as Error).message);
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
        type: fd.get("type") as UnitType,
        area: fd.get("area") as string,
      });
      setCreateOpen(false);
      toast.success(t("created"));
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
        type: fd.get("type") as UnitType,
        area: fd.get("area") as string,
      });
      setEditUnit(null);
      toast.success(t("updated"));
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
      toast.success(t("deleted"));
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
      toast.success(t("assignedSuccess"));
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
      toast.success(t("unassignedSuccess"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  const unitFormFields = (defaults?: UnitRow) => (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label htmlFor="unitNumber">{t("unitNumber")}</Label>
        <Input id="unitNumber" name="unitNumber" defaultValue={defaults?.unitNumber ?? ""} required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="floor">{t("floor")}</Label>
        <Input id="floor" name="floor" type="number" defaultValue={defaults?.floor ?? ""} required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="entrance">{t("entrance")}</Label>
        <Input id="entrance" name="entrance" type="number" defaultValue={defaults?.entrance ?? 1} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="type">{t("type")}</Label>
        <select name="type" defaultValue={defaults?.type ?? "residential"} className="mt-1 field">
          {UNIT_TYPES.map((type) => (
            <option key={type} value={type}>{t(`types.${type}`)}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="area">{t("area")}</Label>
        <Input id="area" name="area" type="number" step="0.01" defaultValue={defaults?.area ?? ""} required className="mt-1" />
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-80 pl-9 pr-8"
            />
            {search && (
              <button type="button" aria-label={tc("reset")} onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground">
                <IconX className="size-4" />
              </button>
            )}
          </div>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select">
            <option value="">{t("allTypes")}</option>
            {UNIT_TYPES.map((type) => (
              <option key={type} value={type}>{t(`types.${type}`)}</option>
            ))}
          </select>

          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value as OwnerFilter)}
            className="filter-select">
            {OWNER_FILTERS.map((filter) => (
              <option key={filter} value={filter}>{t(`ownerFilters.${filter}`)}</option>
            ))}
          </select>
        </div>

        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            + {t("createUnit")}
          </Button>
        )}
      </div>

      <div className="surface-panel overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">{t("entrance")}</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">{t("floor")}</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">{t("type")}</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground">{t("area")}</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">{t("owners")}</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-muted/50">
                <td className="px-4 py-3 text-sm font-medium">{u.unitNumber}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{u.entrance}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{u.floor}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge variant="secondary">{t(`types.${u.type}`)}</Badge>
                </td>
                <td className="px-4 py-3 text-right text-sm">{formatNumber(u.area)} {tc("squareMeters")}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {u.ownerNames.length > 0 ? u.ownerNames.join(", ") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {canManage && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditUnit(u); }}>
                        {tc("edit")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAssign(u)}>
                        {t("assign")}
                      </Button>
                      {u.ownerCount > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setDetachUnit(u)}>
                          {t("detach")}
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => setDeleteId(u.id)}>
                        {tc("delete")}
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t("none")}</p>}
      </div>
      <p className="text-sm text-muted-foreground">{t("showing", {shown: filtered.length, total: units.length})}</p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("createUnit")}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {unitFormFields()}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={pending}>{pending ? t("creating") : tc("create")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUnit} onOpenChange={(o) => { if (!o) setEditUnit(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("editUnit")}</DialogTitle></DialogHeader>
          {editUnit && (
            <form onSubmit={handleEdit} className="space-y-4">
              {unitFormFields(editUnit)}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditUnit(null)}>{tc("cancel")}</Button>
                <Button type="submit" disabled={pending}>{pending ? t("saving") : tc("save")}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignUnit} onOpenChange={(o) => { if (!o) { setAssignUnit(null); setSelectedOwnerId(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("assignTitle")}</DialogTitle></DialogHeader>
          {assignUnit && (
            <form onSubmit={handleAssign} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("unitSummary", {unit: assignUnit.unitNumber, entrance: assignUnit.entrance, floor: assignUnit.floor})}
              </p>
              <div>
                <Label htmlFor="owner">{t("owner")}</Label>
                <select
                  id="owner"
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  required
                  className="mt-1 field"
                >
                  <option value="">{t("chooseOwner")}</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>{o.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setAssignUnit(null); setSelectedOwnerId(""); }}>{tc("cancel")}</Button>
                <Button type="submit" disabled={pending || !selectedOwnerId}>{pending ? t("assigning") : t("assign")}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!detachUnit} onOpenChange={(o) => { if (!o) setDetachUnit(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("detachTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {detachUnit && t("detachConfirm", {
                unit: detachUnit.unitNumber,
                entrance: detachUnit.entrance,
                floor: detachUnit.floor,
                owner: detachUnit.ownerNames[0] ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDetach} disabled={pending}>{pending ? t("detaching") : t("detach")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={pending}>{tc("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
