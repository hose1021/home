"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {PLATFORM_NAME} from "@/core/config";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
    IconArrowRight,
    IconBuildingCommunity,
    IconBuildingSkyscraper,
    IconLoader2,
    IconLock,
} from "@tabler/icons-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) router.push("/");
      })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Не удалось войти");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/50 p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Card className="overflow-hidden p-0 shadow-lg">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form onSubmit={handleSubmit} className="flex flex-col justify-center p-6 md:p-10">
              <div className="mb-8 flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconBuildingCommunity className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{PLATFORM_NAME}</p>
                  <p className="text-xs text-muted-foreground">Управление домом</p>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">С возвращением</h1>
                  <p className="text-balance text-sm text-muted-foreground">
                    Введите данные, полученные у администратора дома
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="username">Логин</Label>
                  <Input
                    id="username"
                    name="username"
                    className="h-10"
                    placeholder="имя.фамилия"
                    pattern="[\p{L}]+\.[\p{L}]+"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Пароль</Label>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <IconLock className="size-3.5" /> Защищённый вход
                    </span>
                  </div>
                  <Input id="password" name="password" type="password" className="h-10" autoComplete="current-password" required minLength={8} />
                </div>

                {error && (
                  <div role="alert" aria-live="polite" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={pending} size="lg" className="w-full">
                  {pending ? <><IconLoader2 className="animate-spin" /> Входим...</> : <>Войти <IconArrowRight /></>}
                </Button>
              </div>

              <p className="mt-8 text-center text-xs text-muted-foreground">
                Для восстановления доступа обратитесь к администратору дома.
              </p>
            </form>

            <div className="relative hidden min-h-[610px] overflow-hidden bg-zinc-950 md:block">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.16),transparent_28%),linear-gradient(145deg,#27272a_0%,#09090b_65%)]" />
              <div className="absolute inset-x-10 top-10 flex items-center justify-between text-white/70">
                <span className="text-xs font-medium uppercase tracking-[0.22em]">MMMC</span>
                <span className="rounded-full border border-white/15 px-3 py-1 text-[10px]">Bakı</span>
              </div>
              <div className="absolute inset-x-10 bottom-10 text-white">
                <IconBuildingSkyscraper className="mb-6 size-16 stroke-[1.25] text-white/80" />
                <p className="max-w-xs text-3xl font-semibold leading-tight">Всё управление домом в одном месте.</p>
                <p className="mt-3 max-w-xs text-sm leading-6 text-white/55">Финансы, заявки, собрания и объявления — прозрачно для правления и собственников.</p>
              </div>
              <div className="absolute -right-16 top-28 h-72 w-52 rotate-12 rounded-[2.5rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur" />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
