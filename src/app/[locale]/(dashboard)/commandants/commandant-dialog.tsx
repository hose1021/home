"use client";

import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {createCommandantAction, updateCommandantAction} from "@/modules/commandants/commandant.actions";

export type CommandantRow = {
  id: string;
  ownerId: string | null;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
};

export type OwnerOption = {
  id: string;
  fullName: string;
  phone: string | null;
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type FormState = {
  ownerId: string;
  fullName: string;
  phone: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

const emptyForm: FormState = {
  ownerId: "",
  fullName: "",
  phone: "",
  isActive: true,
  startDate: today(),
  endDate: "",
};

export function CommandantDialog({
  open,
  onOpenChange,
  owners,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owners: OwnerOption[];
  initial: CommandantRow | null;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          ownerId: initial.ownerId ?? "",
          fullName: initial.fullName,
          phone: initial.phone ?? "",
          isActive: initial.isActive,
          startDate: initial.startDate,
          endDate: initial.endDate ?? "",
        }
      : emptyForm,
  );

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function onOwnerChange(ownerId: string) {
    const owner = owners.find((o) => o.id === ownerId);
    setForm((prev) => ({
      ...prev,
      ownerId,
      fullName: owner ? owner.fullName : prev.fullName,
      phone: owner ? (owner.phone ?? "") : prev.phone,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const payload = {
      ownerId: form.ownerId || null,
      fullName: form.fullName.trim(),
      phone: form.phone.trim() || null,
      isActive: form.isActive,
      startDate: form.startDate,
      endDate: form.endDate || null,
    };
    try {
      if (initial) {
        await updateCommandantAction(initial.id, payload);
        toast.success("Комендант обновлён");
      } else {
        await createCommandantAction(payload);
        toast.success("Комендант добавлен");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Изменить коменданта" : "Добавить коменданта"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Из собственников (необязательно)</label>
            <select
              value={form.ownerId}
              onChange={(e) => onOwnerChange(e.target.value)}
              className={inputClass}
            >
              <option value="">— вручную —</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>{owner.fullName}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Имя Фамилия</label>
              <input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium">Телефон</label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} type="tel" className={inputClass} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Начало периода</label>
              <input value={form.startDate} onChange={(e) => set("startDate", e.target.value)} type="date" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium">Конец периода</label>
              <input value={form.endDate} onChange={(e) => set("endDate", e.target.value)} type="date" className={inputClass} />
              <p className="mt-1 text-xs text-muted-foreground">Пусто = по настоящее время</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700"
            />
            <span className="text-sm">Активный комендант</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
