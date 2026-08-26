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
import {createContractorAction, updateContractorAction} from "@/modules/contractor/contractor.actions";

type Contractor = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  taxId: string | null;
  specialties: string[] | null;
  status: "invited" | "active" | "suspended" | "terminated";
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  invited: "secondary",
  active: "default",
  suspended: "outline",
  terminated: "destructive",
};

export function ContractorsBoard({ contractors, canManage }: {
  contractors: Contractor[];
  canManage: boolean;
}) {
  const t = useTranslations("contractors");
  const [edit, setEdit] = useState<Contractor | null | "new">(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{contractors.length} {t("count")}</p>
        {canManage && <Button size="sm" onClick={() => setEdit("new")}>+ {t("create")}</Button>}
      </div>

      <div className="surface-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("contactPerson")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("specialties")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              {canManage && <TableHead className="w-[80px] text-right" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractors.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} className="py-10 text-center text-sm text-muted-foreground">
                  {t("emptyDescription")}
                </TableCell>
              </TableRow>
            )}
            {contractors.map((c) => (
              <TableRow key={c.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.contactPerson ?? "—"}</TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell>{c.specialties?.join(", ") ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[c.status] ?? "secondary"}>{t(`statuses.${c.status}`)}</Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEdit(c)}>{t("edit")}</Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {edit && (
        <ContractorDialog
          contractor={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  );
}

function ContractorDialog({ contractor, onClose }: {
  contractor: Contractor | null;
  onClose: () => void;
}) {
  const t = useTranslations("contractors");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(contractor?.name ?? "");
  const [contactPerson, setContactPerson] = useState(contractor?.contactPerson ?? "");
  const [phone, setPhone] = useState(contractor?.phone ?? "");
  const [specialties, setSpecialties] = useState(contractor?.specialties?.join(", ") ?? "");
  const [status, setStatus] = useState(contractor?.status ?? "active");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error(t("nameRequired")); return; }
    setPending(true);
    try {
      const input = {
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean),
        status,
      };
      if (contractor) {
        await updateContractorAction(contractor.id, input);
      } else {
        await createContractorAction(input);
      }
      toast.success(contractor ? t("updated") : t("created"));
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
        <DialogHeader>
          <DialogTitle>{contractor ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="c-name">{t("name")}</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="c-contact">{t("contactPerson")}</Label>
              <Input id="c-contact" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="c-phone">{t("phone")}</Label>
              <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="c-spec">{t("specialties")}</Label>
            <Input id="c-spec" value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder={t("specialtiesHint")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="c-status">{t("status")}</Label>
            <select id="c-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              {(["invited", "active", "suspended", "terminated"] as const).map((s) => (
                <option key={s} value={s}>{t(`statuses.${s}`)}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{tc("cancel")}</Button>
            <Button type="submit" disabled={pending}>{pending ? t("saving") : tc("save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
