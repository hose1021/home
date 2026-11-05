"use client";

import {
    IconArrowRight,
    IconBuildingCommunity,
    IconLoader2,
    IconLock,
} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {PLATFORM_NAME} from "@/core/config";
import {useRouter} from "@/i18n/navigation";

export default function LoginPage() {
  const t = useTranslations("auth");
  const tn = useTranslations("nav");
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
        setError(data.error || t("loginFailed"));
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.1fr_0.9fr]">
      {/* Launch panel: blue light over the storefront's dark surface */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden border-r border-border p-10 xl:p-14 lg:flex"
        style={{
          background:
            "radial-gradient(780px 520px at 6% 0%, color-mix(in srgb, #0074E0 46%, transparent), transparent 62%), radial-gradient(560px 380px at 98% 100%, color-mix(in srgb, #FFB400 8%, transparent), transparent 65%), #111218",
        }}
      >
        <div className="relative flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-[4px] bg-[#0074E0] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.24)]">
            <IconBuildingCommunity className="size-[18px]" />
          </span>
          <div className="leading-tight">
            <p className="font-heading text-sm font-bold text-white">{PLATFORM_NAME}</p>
            <p className="mt-0.5 text-xs text-white/50">Bakı · MMMC</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <p className="text-xs font-semibold text-white/50">{tn("houseManagement")}</p>
          <h1 className="mt-3 font-heading text-[2.4rem] font-extrabold leading-[1.05] tracking-[-0.025em] text-white xl:text-[3rem]">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/60">{t("heroSubtitle")}</p>

          <div className="mt-8 flex flex-wrap gap-2">
            {[tn("finance"), tn("tickets"), tn("meetings"), tn("announcements")].map((label) => (
              <span
                key={label}
                className="rounded-[4px] bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white/75"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-white/10 pt-4">
          <p className="amount text-[10px] text-white/40">{PLATFORM_NAME}</p>
          <span className="flex items-center gap-1.5 text-[10px] text-white/40">
            <IconLock className="size-3" /> {t("secureEntry")}
          </span>
        </div>
      </aside>

      {/* Credentials */}
      <section className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-[4px] bg-[#0074E0] text-white">
              <IconBuildingCommunity className="size-[18px]" />
            </span>
            <span className="font-heading text-sm font-bold">{PLATFORM_NAME}</span>
          </div>

          <div className="panel p-6 sm:p-8">
            <form onSubmit={handleSubmit}>
              <p className="text-xs font-semibold text-muted-foreground">{t("secureEntry")}</p>
              <h2 className="mt-1.5 font-heading text-2xl font-extrabold tracking-[-0.02em]">{t("welcomeBack")}</h2>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t("loginInstructions")}</p>

              <div className="mt-6 grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username" className="text-sm font-semibold">{t("login")}</Label>
                  <Input
                    id="username"
                    name="username"
                    className="h-10"
                    placeholder={t("loginPlaceholder")}
                    pattern="[\p{L}]+\.[\p{L}]+"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-semibold">{t("password")}</Label>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <IconLock className="size-3" /> {t("secureEntry")}
                    </span>
                  </div>
                  <Input id="password" name="password" type="password" className="h-10" autoComplete="current-password" required minLength={8} />
                </div>

                {error && (
                  <div role="alert" aria-live="polite" className="rounded-[4px] border border-destructive/40 bg-destructive/15 px-3 py-2.5 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={pending} size="lg" className="mt-1 w-full">
                  {pending ? <><IconLoader2 className="animate-spin" /> {t("signingIn")}</> : <>{t("signIn")} <IconArrowRight /></>}
                </Button>
              </div>

              <p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
                {t("recoveryNote")}
              </p>
            </form>
          </div>

          <p className="mt-5 text-center text-[10px] text-muted-foreground/60">
            {PLATFORM_NAME} · {new Date().getFullYear()}
          </p>
        </div>
      </section>
    </main>
  );
}
