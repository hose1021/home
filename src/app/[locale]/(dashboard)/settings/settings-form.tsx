"use client";

import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {updateSettingsAction} from "@/modules/settings/settings.actions";

type TenantData = {
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  taxId: string | null;
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function SettingsForm({ tenant }: { tenant: TenantData }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await updateSettingsAction({
        name: (fd.get("name") as string).trim(),
        address: (fd.get("address") as string)?.trim() || null,
        phone: (fd.get("phone") as string)?.trim() || null,
        taxId: (fd.get("taxId") as string)?.trim() || null,
      });
      toast.success("Настройки сохранены");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="settings-name" className="block text-sm font-medium">Название организации</label>
        <input id="settings-name" name="name" defaultValue={tenant.name} required className={inputClass} />
      </div>
      <div>
        <label htmlFor="settings-slug" className="block text-sm font-medium">Slug</label>
        <input id="settings-slug" defaultValue={tenant.slug} disabled className={`${inputClass} opacity-60`} />
        <p className="mt-1 text-xs text-muted-foreground">Используется в URL, изменить нельзя</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="settings-phone" className="block text-sm font-medium">Телефон</label>
          <input id="settings-phone" name="phone" type="tel" defaultValue={tenant.phone ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="settings-taxid" className="block text-sm font-medium">VOEN / ИНН</label>
          <input id="settings-taxid" name="taxId" defaultValue={tenant.taxId ?? ""} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="settings-address" className="block text-sm font-medium">Адрес</label>
        <textarea
          id="settings-address"
          name="address"
          defaultValue={tenant.address ?? ""}
          rows={2}
          className={inputClass}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохранение..." : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}
