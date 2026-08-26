"use client";

import {IconSearch, IconX} from "@tabler/icons-react";
import {useRouter, useSearchParams} from "next/navigation";
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
import {type Role, ROLE_LABELS, ROLE_ORDER} from "@/core/auth/permissions";
import {Link} from "@/i18n/navigation";
import {OwnerCreateForm} from "@/modules/owner/components/OwnerCreateForm";
import {OwnerEditForm} from "@/modules/owner/components/OwnerEditForm";
import {deleteOwnerAction} from "@/modules/owner/owner.actions";

const ALL_ROLES = ROLE_ORDER.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

type OwnerRow = {
  id: string;
  userId: string | null;
  fullName: string;
  phone: string | null;
  username: string;
  roles: string[];
  unitCount: number;
  hasDebt: boolean;
  hasPaid: boolean;
};

export function OwnerTable({ owners, canManage, canManageRoles, initialSearch, initialRole, initialUnits, initialPayment }: {
  owners: OwnerRow[];
  canManage?: boolean;
  canManageRoles?: boolean;
  initialSearch?: string;
  initialRole?: string;
  initialUnits?: string;
  initialPayment?: string;
}) {
  const to = useTranslations("owners");
  const tc = useTranslations("common");
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(initialSearch ?? sp.get("search") ?? "");
  const [roleFilter, setRoleFilter] = useState(initialRole ?? sp.get("role") ?? "");
  const [unitsFilter, setUnitsFilter] = useState(initialUnits ?? sp.get("units") ?? "");
  const [paymentFilter, setPaymentFilter] = useState(initialPayment ?? sp.get("payment") ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<OwnerRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function updateURL(s: string, r: string, u: string, p: string) {
    const params = new URLSearchParams();
    if (s) params.set("search", s);
    if (r) params.set("role", r);
    if (u) params.set("units", u);
    if (p) params.set("payment", p);
    const q = params.toString();
    router.replace(q ? `?${q}` : window.location.pathname, { scroll: false });
  }

  const filtered = useMemo(() => {
    let list = owners;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.fullName.toLowerCase().includes(q) ||
        o.phone?.toLowerCase().includes(q) ||
        o.username.toLowerCase().includes(q)
      );
    }
    if (roleFilter) {
      list = list.filter((o) => o.roles.includes(roleFilter));
    }
    if (unitsFilter) {
      const count = Number(unitsFilter);
      list = list.filter((o) => unitsFilter === "3" ? o.unitCount >= 3 : o.unitCount === count);
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
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); updateURL(e.target.value, roleFilter, unitsFilter, paymentFilter); }}
              placeholder={to("searchPlaceholder")}
              className="h-9 w-64 pl-9 pr-8"
            />
            {search && (
              <button onClick={() => { setSearch(""); updateURL("", roleFilter, unitsFilter, paymentFilter); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                <IconX className="size-4" />
              </button>
            )}
          </div>

          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); updateURL(search, e.target.value, unitsFilter, paymentFilter); }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
            <option value="">{to("filterByRole")}</option>
            {ALL_ROLES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
          </select>

          <select value={unitsFilter} onChange={(e) => { setUnitsFilter(e.target.value); updateURL(search, roleFilter, e.target.value, paymentFilter); }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
            {UNIT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>

          <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); updateURL(search, roleFilter, unitsFilter, e.target.value); }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
            {PAYMENT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
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
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">{to("fullName")}</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">{to("role")}</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">{to("phone")}</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">{tc("auth.login")}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">{to("units")}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-muted/50">
                <td className="px-4 py-3 text-sm font-medium">
                  <Link href={`/owners/${o.id}`} className="hover:underline">{o.fullName}</Link>
                </td>
                <td className="px-4 py-3 text-sm"><RoleBadge roles={o.roles} /></td>
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

function RoleBadge({ roles }: { roles: string[] }) {
  if (roles.length === 0) return null;
  const colors: Record<string, string> = {
    admin: "admin",
    management_member: "management_member",
    commandant: "commandant",
    owner: "secondary",
  };
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <Badge variant={colors[r] as "admin" | "secondary" | "management_member" | "commandant"} key={r}>{ROLE_LABELS[r as Role] ?? r}</Badge>
      ))}
    </div>
  );
}
