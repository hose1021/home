"use client";

import {useTranslations} from "next-intl";
import {useMemo, useState} from "react";
import {toast} from "sonner";
import {RoleBadges} from "@/components/role-badge";
import {FilterSearch, FilterSelect, matchesQuery, useTableQuery} from "@/components/table-filters";
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
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {ROLES, type Role} from "@/core/db/schema/enums";
import {Link} from "@/i18n/navigation";
import {OwnerCreateForm} from "@/modules/owner/components/OwnerCreateForm";
import {OwnerEditForm} from "@/modules/owner/components/OwnerEditForm";
import {deleteOwnerAction} from "@/modules/owner/owner.actions";

type OwnerRow = {
  id: string;
  userId: string | null;
  fullName: string;
  phone: string | null;
  username: string;
  roles: Role[];
  unitCount: number;
  hasDebt: boolean;
  hasPaid: boolean;
};

const UNIT_MATCHERS: Record<string, (count: number) => boolean> = {
  "1": (count) => count === 1,
  "2": (count) => count === 2,
  "3": (count) => count >= 3,
};

export function OwnerTable({ owners, canManage, canManageRoles }: {
  owners: OwnerRow[];
  canManage?: boolean;
  canManageRoles?: boolean;
}) {
  const to = useTranslations("owners");
  const tc = useTranslations("common");
  const ta = useTranslations("auth");
  const roleOptions = ROLES.map((role) => ({value: role, label: ta(`roleLabels.${role}`)}));
  const params = useTableQuery("");
  const search = params.value("search");
  const roleFilter = params.value("role");
  const unitsFilter = params.value("units");
  const paymentFilter = params.value("payment");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<OwnerRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = owners;
    if (search) {
      list = list.filter((o) => matchesQuery(search, [o.fullName, o.phone, o.username]));
    }
    if (roleFilter) {
      list = list.filter((o) => o.roles.some((role) => role === roleFilter));
    }
    if (unitsFilter) {
      const match = UNIT_MATCHERS[unitsFilter];
      list = list.filter((o) => match?.(o.unitCount) ?? true);
    }
    if (paymentFilter === "debt") {
      list = list.filter((o) => o.hasDebt);
    } else if (paymentFilter === "paid") {
      list = list.filter((o) => o.hasPaid);
    }
    return list;
  }, [owners, search, roleFilter, unitsFilter, paymentFilter]);

  async function handleDelete() {
    if (!deleteId) return;
    await deleteOwnerAction(deleteId);
    setDeleteId(null);
    toast(to("deleteOwner"));
  }

  const UNIT_OPTIONS = [
    { value: "", label: tc("all") + " " + to("units") },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3+" },
  ];

  const PAYMENT_OPTIONS = [
    { value: "", label: tc("all") },
    { value: "debt", label: to("hasDebt") },
    { value: "paid", label: to("paidThisMonth") },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSearch
            value={search}
            onChange={(value) => params.update({search: value})}
            placeholder={to("searchPlaceholder")}
            clearLabel={tc("reset")}
          />

          <FilterSelect
            label={to("filterByRole")}
            value={roleFilter}
            onChange={(value) => params.update({role: value})}
            options={[{value: "", label: to("filterByRole")}, ...roleOptions]}
          />

          <FilterSelect
            label={to("units")}
            value={unitsFilter}
            onChange={(value) => params.update({units: value})}
            options={UNIT_OPTIONS}
          />

          <FilterSelect
            label={tc("filter")}
            value={paymentFilter}
            onChange={(value) => params.update({payment: value})}
            options={PAYMENT_OPTIONS}
          />
        </div>

        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            + {to("createOwner")}
          </Button>
        )}
      </div>

      <div className="surface-panel overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">{to("fullName")}</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">{to("role")}</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">{to("phone")}</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">{tc("auth.login")}</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground">{to("units")}</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-muted/50">
                <td className="px-4 py-3 text-sm font-medium">
                  <Link href={`/owners/${o.id}`} className="hover:underline">{o.fullName}</Link>
                </td>
                <td className="px-4 py-3 text-sm"><RoleBadges roles={o.roles} /></td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{o.phone ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{o.username}</td>
                <td className="px-4 py-3 text-right text-sm">{o.unitCount}</td>
                <td className="px-4 py-3 text-right">
                  {canManage && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(o)}>{tc("edit")}</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteId(o.id)}>{tc("delete")}</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{to("noOwners")}</p>}
      </div>
      <p className="text-sm text-muted-foreground">{tc("total")}: {filtered.length} / {owners.length}</p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{to("createOwner")}</DialogTitle></DialogHeader>
          <OwnerCreateForm onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{to("editOwner")}</DialogTitle></DialogHeader>
          {editing && <OwnerEditForm owner={editing} canManageRoles={canManageRoles} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{to("deleteOwner")}</AlertDialogTitle>
            <AlertDialogDescription>{tc("confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{tc("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
