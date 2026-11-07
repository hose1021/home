"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {PASSWORD_MIN_LENGTH, USERNAME_PATTERN} from "@/core/auth/constants";
import {UNIT_TYPES, type UnitType} from "@/core/db/schema/enums";
import {createOwnerAction} from "../owner.actions";

export function OwnerCreateForm({
  onDone,
}: {
  onDone: () => void;
}) {
  const t = useTranslations("owners");
  const tu = useTranslations("units");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await createOwnerAction({
        fullName: fd.get("fullName") as string,
        phone: (fd.get("phone") as string) || undefined,
        username: fd.get("username") as string,
        password: fd.get("password") as string,
        unitNumber: fd.get("unitNumber") as string,
        entrance: Number(fd.get("entrance")),
        floor: Number(fd.get("floor")),
        type: fd.get("type") as UnitType,
        area: fd.get("area") as string,
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="rounded-[4px] border border-border p-3 dark:border-border">
        <legend className="px-1 text-sm font-medium">{t("ownerFieldset")}</legend>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">{t("fullName")}</label>
            <input name="fullName" required className="mt-1 field" />
          </div>
          <div>
            <label className="block text-sm font-medium">{t("phone")}</label>
            <input name="phone" className="mt-1 field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">{ta("login")}</label>
              <input name="username" placeholder={ta("loginPlaceholder")} pattern={USERNAME_PATTERN.source} required className="mt-1 field" />
            </div>
            <div>
              <label className="block text-sm font-medium">{ta("password")}</label>
              <input name="password" type="password" minLength={PASSWORD_MIN_LENGTH} required className="mt-1 field" />
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-[4px] border border-border p-3 dark:border-border">
        <legend className="px-1 text-sm font-medium">{t("unitFieldset")}</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">{tu("unitNumber")}</label>
            <input name="unitNumber" required className="mt-1 field" />
          </div>
          <div>
            <label className="block text-sm font-medium">{tu("floor")}</label>
            <input name="floor" type="number" required className="mt-1 field" />
          </div>
          <div>
            <label className="block text-sm font-medium">{tu("entrance")}</label>
            <input name="entrance" type="number" defaultValue={1} className="mt-1 field" />
          </div>
          <div>
            <label className="block text-sm font-medium">{tu("type")}</label>
            <select name="type" className="mt-1 field">
              {UNIT_TYPES.map((type) => (
                <option key={type} value={type}>{tu(`types.${type}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">{tu("area")}</label>
            <input name="area" type="number" step="0.01" required className="mt-1 field" />
          </div>
        </div>
      </fieldset>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onDone}>{tc("cancel")}</Button>
        <Button type="submit" disabled={pending}>{pending ? t("creating") : tc("create")}</Button>
      </div>
    </form>
  );
}
