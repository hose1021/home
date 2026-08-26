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
import {createManagementMemberAction, updateManagementMemberAction} from "@/modules/management-member/management-member.actions";

type Member = {
  id: string;
  fullName: string;
  blockLabel: string;
  position: string | null;
  sortOrder: number;
};

export function ManagementBoard({ members, canManage }: {
  members: Member[];
  canManage: boolean;
}) {
  const t = useTranslations("management");
  const [edit, setEdit] = useState<Member | null | "new">(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{members.length} {t("count")}</p>
        {canManage && <Button size="sm" onClick={() => setEdit("new")}>+ {t("create")}</Button>}
      </div>

      <div className="surface-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">#</TableHead>
              <TableHead>{t("fullName")}</TableHead>
              <TableHead>{t("blockLabel")}</TableHead>
              <TableHead>{t("position")}</TableHead>
              {canManage && <TableHead className="w-[80px] text-right" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="py-10 text-center text-sm text-muted-foreground">
                  {t("emptyDescription")}
                </TableCell>
              </TableRow>
            )}
            {members.map((m) => (
              <TableRow key={m.id} className="hover:bg-muted/50">
                <TableCell className="text-muted-foreground">{m.sortOrder}</TableCell>
                <TableCell className="font-medium">{m.fullName}</TableCell>
                <TableCell>{m.blockLabel}</TableCell>
                <TableCell>{m.position ? <Badge variant="secondary">{m.position}</Badge> : "—"}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEdit(m)}>{t("edit")}</Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {edit && <MemberDialog member={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function MemberDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const t = useTranslations("management");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [fullName, setFullName] = useState(member?.fullName ?? "");
  const [blockLabel, setBlockLabel] = useState(member?.blockLabel ?? "");
  const [position, setPosition] = useState(member?.position ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !blockLabel.trim()) { toast.error(t("nameRequired")); return; }
    setPending(true);
    try {
      if (member) {
        await updateManagementMemberAction(member.id, {
          fullName: fullName.trim(),
          blockLabel: blockLabel.trim(),
          position: position.trim() || undefined,
        });
      } else {
        await createManagementMemberAction({
          fullName: fullName.trim(),
          blockLabel: blockLabel.trim(),
          position: position.trim() || undefined,
        });
      }
      toast.success(member ? t("updated") : t("created"));
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
        <DialogHeader><DialogTitle>{member ? t("editTitle") : t("createTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="m-name">{t("fullName")}</Label>
            <Input id="m-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="m-block">{t("blockLabel")}</Label>
              <Input id="m-block" value={blockLabel} onChange={(e) => setBlockLabel(e.target.value)} className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="m-pos">{t("position")}</Label>
              <Input id="m-pos" value={position} onChange={(e) => setPosition(e.target.value)} className="mt-1" />
            </div>
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
