"use client";

import {useTranslations} from "next-intl";
import {useActionState} from "react";
import {createTenantAction} from "../tenant.actions";

const initialState = { success: false, error: null as string | null };

export function TenantForm() {
  const tt = useTranslations("tenant");
  const tc = useTranslations("common");
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      try {
        await createTenantAction({
          slug: formData.get("slug") as string,
          name: formData.get("name") as string,
          address: formData.get("address") as string | undefined,
          phone: formData.get("phone") as string | undefined,
        });
        return { success: true, error: null };
      } catch (e) {
        return { success: false, error: (e as Error).message };
      }
    },
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">{tt("name")}</label>
        <input
          id="name"
          name="name"
          required
          className="mt-1 field"
        />
      </div>
      <div>
        <label htmlFor="slug" className="block text-sm font-medium">{tt("slug")}</label>
        <input
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9-]+"
          className="mt-1 field"
        />
        <p className="mt-1 text-xs text-muted-foreground/70">{tt("slugHint")}</p>
      </div>
      <div>
        <label htmlFor="address" className="block text-sm font-medium">{tt("address")}</label>
        <input
          id="address"
          name="address"
          className="mt-1 field"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium">{tt("phone")}</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="mt-1 field"
          />
        </div>
      </div>
      {state.error && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[4px] bg-[#0074E0] px-5 py-2 text-sm font-bold text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.24)] transition hover:bg-[#0A80F0] disabled:opacity-50 dark:bg-zinc-100 dark:text-foreground"
      >
        {pending ? tc("create") + "..." : tc("create")}
      </button>
    </form>
  );
}
