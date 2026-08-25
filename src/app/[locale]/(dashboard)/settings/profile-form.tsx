"use client";

import {useState} from "react";
import {toast} from "sonner";
import {updateProfileAction} from "@/modules/settings/settings.actions";
import {Button} from "@/components/ui/button";

type ProfileData = {
  fullName: string;
  phone: string | null;
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function ProfileForm({ profile }: { profile: ProfileData }) {
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
      toast.success("Профиль обновлён");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="profile-fullname" className="block text-sm font-medium">ФИО</label>
        <input id="profile-fullname" name="fullName" defaultValue={profile.fullName} required className={inputClass} />
      </div>
      <div>
        <label htmlFor="profile-phone" className="block text-sm font-medium">Телефон</label>
        <input id="profile-phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} className={inputClass} />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохранение..." : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}
