"use client";

import {useEffect, useState} from "react";
import {useRouter} from "@/i18n/navigation";
import {PLATFORM_NAME} from "@/core/config";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useTranslations} from "next-intl";
import {
    IconArrowRight,
    IconLoader2,
    IconLock,
} from "@tabler/icons-react";

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
    <main className="grid min-h-svh bg-background lg:grid-cols-[5fr_6fr]">
      {/* Facade panel: the entrance sign itself */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-(--primary) p-10 text-(--primary-foreground) lg:flex">
        {/* floor-line motif */}
        <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "repeating-linear-gradient(to top, transparent 0 79px, currentColor 79px 80px)",
        }} />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.3em] opacity-70">MMMC · Bakı</p>
        </div>

        <div className="relative max-w-md">
          <div className="inline-flex items-center gap-2 rounded-sm border border-white/25 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em]">
            <span className="size-1.5 rounded-[1px] bg-brass" style={{background: "#C4A45C"}} />
            {tn("houseManagement")}
          </div>
          <h1 className="mt-6 font-(family-name:--font-display) text-4xl font-semibold leading-[1.08] tracking-tight">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 opacity-75">{t("heroSubtitle")}</p>
        </div>

        <p className="relative font-(family-name:--font-mono-brand) text-xs tracking-wide opacity-60">
          {PLATFORM_NAME}
        </p>
      </aside>

      {/* Form on plaster */}
      <div className="flex items-center justify-center p-5 sm:p-8 md:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="inline-flex items-center gap-2 rounded-sm bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground">
              {PLATFORM_NAME}
            </span>
            <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Bakı</span>
          </div>

          <form onSubmit={handleSubmit} className="surface-panel p-6 sm:p-8">
            <h2 className="page-heading">{t("welcomeBack")}</h2>
            <p className="page-description">{t("loginInstructions")}</p>

            <div className="mt-7 grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="username">{t("login")}</Label>
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
                  <Label htmlFor="password">{t("password")}</Label>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IconLock className="size-3.5" /> {t("secureEntry")}
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
                {pending ? <><IconLoader2 className="animate-spin" /> {t("signingIn")}</> : <>{t("signIn")} <IconArrowRight /></>}
              </Button>
            </div>

            <p className="mt-7 border-t border-border pt-4 text-xs text-muted-foreground">
              {t("recoveryNote")}
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
