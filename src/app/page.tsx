import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/db";
import { tenants } from "@/core/db/schema/tenants";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();

  if (session) {
    const [tenant] = await db
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, session.user.tenantId))
      .limit(1);

    if (tenant) {
      redirect(`/${tenant.slug}`);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 px-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">MMMC Platform</h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400">
            Mənzil Mülkiyyətçilərinin Müştərək Cəmiyyəti
          </p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Единый цифровой центр управления многоквартирным домом
          </p>
        </div>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Войти
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Регистрация
          </Link>
        </div>
      </main>
    </div>
  );
}
