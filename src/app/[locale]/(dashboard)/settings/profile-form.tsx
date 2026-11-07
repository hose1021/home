"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {updateProfileAction} from "@/modules/settings/settings.actions";

type ProfileData = {
  fullName: string;
  phone: string | null;
};

const inputClass =
  "mt-1 field";

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateProfileAction({
        fullName: (fd.get("fullName") as string).trim(),
        phone: (fd.get("phone") as string)?.trim() || null,
      });
      toast.success(t("profileSaved"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="profile-fullname" className="block text-sm font-medium">{t("fullName")}</label>
        <input id="profile-fullname" name="fullName" defaultValue={profile.fullName} required className={inputClass} />
      </div>
      <div>
        <label htmlFor="profile-phone" className="block text-sm font-medium">{t("phone")}</label>
        <input id="profile-phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} className={inputClass} />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : tc("save")}
        </Button>
      </div>
    </form>
  );
}
