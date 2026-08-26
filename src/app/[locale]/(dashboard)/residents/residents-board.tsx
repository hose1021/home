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
import {createResidentAction, updateResidentAction} from "@/modules/resident/resident.actions";

type Resident = {
  id: string;
  fullName: string;
  residentType: "owner" | "family" | "tenant" | "guest" | null;
  phone: string | null;
  movedInAt: string;
  movedOutAt: string | null;
  unitNumber: string | null;
};

const TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  family: "secondary",
  tenant: "secondary",
  guest: "outline",
};

export function ResidentsBoard({ residents, units, canManage }: {
  residents: Resident[];
  units: { id: string; unitNumber: string; entrance: number; floor: number }[];
  canManage: boolean;
}) {
  const t = useTranslations("residents");
  const [open, setOpen] = useState(false);

  async function markMovedOut(id: string) {
    try {
      await updateResidentAction(id, { movedOutAt: new Date().toISOString().slice(0, 10) });
      toast.success(t("updated"));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{residents.length} {t("count")}</p>
        {canManage && <Button size="sm" onClick={() => setOpen(true)}>+ {t("create")}</Button>}
      </div>

      <div className="surface-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fullName")}</TableHead>
              <TableHead>{t("unit")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("movedInAt")}</TableHead>
              {canManage && <TableHead className="w-[100px] text-right" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {residents.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} className="py-10 text-center text-sm text-muted-foreground">
                  {t("emptyDescription")}
                </TableCell>
              </TableRow>
            )}
            {residents.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{r.fullName}</TableCell>
                <TableCell>{r.unitNumber ?? "—"}</TableCell>
                <TableCell>{r.residentType ? <Badge variant={TYPE_VARIANTS[r.residentType] ?? "secondary"}>{t(`types.${r.residentType}`)}</Badge> : "—"}</TableCell>
                <TableCell>{r.phone ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.movedOutAt ? `${r.movedInAt} → ${r.movedOutAt}` : r.movedInAt}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    {!r.movedOutAt && (
                      <Button variant="ghost" size="sm" onClick={() => markMovedOut(r.id)}>{t("movedOut")}</Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {open && <ResidentDialog units={units} onClose={() => setOpen(false)} />}
    </div>
  );
}

function ResidentDialog({ units, onClose }: {
  units: { id: string; unitNumber: string; entrance: number; floor: number }[];
  onClose: () => void;
}) {
  const t = useTranslations("residents");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [fullName, setFullName] = useState("");
  const [residentType, setResidentType] = useState<Resident["residentType"]>("family");
  const [phone, setPhone] = useState("");
  const [movedInAt, setMovedInAt] = useState(new Date().toISOString().slice(0, 10));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId || !fullName.trim()) { toast.error(t("required")); return; }
    setPending(true);
    try {
      await createResidentAction({
        unitId,
        fullName: fullName.trim(),
        residentType: residentType ?? "family",
        phone: phone.trim() || undefined,
        movedInAt,
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
            <Label htmlFor="r-name">{t("fullName")}</Label>
            <Input id="r-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="r-unit">{t("unit")}</Label>
              <select id="r-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                <option value="">—</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="r-type">{t("type")}</Label>
              <select id="r-type" value={residentType ?? "family"} onChange={(e) => setResidentType(e.target.value as Resident["residentType"])} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                {(["owner", "family", "tenant", "guest"] as const).map((ty) => <option key={ty} value={ty}>{t(`types.${ty}`)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="r-phone">{t("phone")}</Label>
              <Input id="r-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="r-in">{t("movedInAt")}</Label>
              <Input id="r-in" value={movedInAt} onChange={(e) => setMovedInAt(e.target.value)} type="date" className="mt-1" required />
            </div>
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
