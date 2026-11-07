"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
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
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {UNIT_TYPES, type UnitType} from "@/core/db/schema/enums";
import {removeUnitFromOwnerAction} from "@/modules/owner/owner.actions";
import {updateUnitAction} from "@/modules/unit/unit.actions";

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
  const t = useTranslations("units");
  const tc = useTranslations("common");
  const to = useTranslations("owners");

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateUnitAction(unit.id, {
        unitNumber: fd.get("unitNumber") as string,
        entrance: Number(fd.get("entrance")),
        floor: Number(fd.get("floor")),
        type: fd.get("type") as UnitType,
        area: fd.get("area") as string,
      });
      setEditOpen(false);
      toast.success(t("updated"));
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
      toast.success(t("detached"));
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
            {tc("edit")}
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRemoveOpen(true)}>
            {t("detach")}
          </Button>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("editUnit")}</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">{t("unitNumber")}</label>
                <input name="unitNumber" defaultValue={unit.unitNumber} required className="mt-1 field" />
              </div>
              <div>
                <label className="block text-sm font-medium">{t("floor")}</label>
                <input name="floor" type="number" defaultValue={unit.floor} required className="mt-1 field" />
              </div>
              <div>
                <label className="block text-sm font-medium">{t("entrance")}</label>
                <input name="entrance" type="number" defaultValue={unit.entrance} className="mt-1 field" />
              </div>
              <div>
                <label className="block text-sm font-medium">{t("type")}</label>
                <select name="type" defaultValue={unit.type} className="mt-1 field">
                  {UNIT_TYPES.map((type) => (
                    <option key={type} value={type}>{t(`types.${type}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">{t("area")}</label>
                <input name="area" type="number" step="0.01" defaultValue={unit.area} required className="mt-1 field" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={pending}>{pending ? to("saving") : tc("save")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("detachTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("detachDescription", {unit: unit.unitNumber})}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={pending}>
              {pending ? t("detaching") : t("detach")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
