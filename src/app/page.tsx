"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user?.tenantSlug) {
          router.push(`/${data.user.tenantSlug}`);
        }
      })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      const slug = data.user?.tenantSlug;
      router.push(slug ? `/${slug}` : "/");
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Pilot Residence Platform</h1>
          <p className="mt-1 text-sm text-zinc-500">Войдите в панель управления MMMC</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium">Никнейм</label>
            <input
              id="username"
              name="username"
              placeholder="имя.фамилия"
              pattern="[\p{L}]+\.[\p{L}]+"
              required
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Пароль</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Вход..." : "Войти"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Не можете зайти? Обратитесь к Админу сайта
        </p>
      </div>
    </div>
  );
}
