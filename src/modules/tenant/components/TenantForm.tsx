"use client";

import { useActionState } from "react";
import { createTenantAction } from "../tenant.actions";

const initialState = { success: false, error: null as string | null };

export function TenantForm() {
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
        <label htmlFor="name" className="block text-sm font-medium">Название MMMC</label>
        <input
          id="name"
          name="name"
          required
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="slug" className="block text-sm font-medium">Slug</label>
        <input
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9-]+"
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-400">Только латиница, цифры и дефисы</p>
      </div>
      <div>
        <label htmlFor="address" className="block text-sm font-medium">Адрес</label>
        <input
          id="address"
          name="address"
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium">Телефон</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>
      {state.error && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Создание..." : "Создать MMMC"}
      </button>
    </form>
  );
}
