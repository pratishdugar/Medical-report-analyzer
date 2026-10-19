import Link from "next/link";
import { LanguageSwitcher } from "@/components/forms";
import { Logo } from "@/components/logo";
import { Card, LinkButton } from "@/components/ui";
import { getSession } from "@/lib/dal";
import { getI18n } from "@/lib/i18n/server";

function PreviewChart() {
  // Decorative example: HbA1c falling into the normal band over four reports.
  const pts = [
    [20, 30],
    [95, 44],
    [170, 70],
    [245, 84],
  ];
  return (
    <svg viewBox="0 0 270 120" className="h-auto w-full" role="img" aria-label="Example HbA1c trend chart">
      <rect x="0" y="72" width="270" height="48" fill="var(--chart-band)" />
      <line x1="0" y1="119.5" x2="270" y2="119.5" stroke="var(--chart-grid)" />
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill={y < 72 ? "var(--bad)" : "var(--series-1)"} stroke="var(--surface)" strokeWidth="2" />
      ))}
      <text x="245" y="104" textAnchor="middle" fontSize="11" fill="var(--fg)" fontWeight="600">5.6%</text>
      <text x="20" y="20" textAnchor="middle" fontSize="11" fill="var(--muted)">7.4%</text>
    </svg>
  );
}

export default async function Landing() {
  const [{ messages: m, t }, session] = await Promise.all([getI18n(), getSession()]);
  const loggedIn = !!session && !session.session.mfaPending;
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Logo name={t("app.name")} />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {loggedIn ? (
            <LinkButton href="/dashboard">{t("nav.dashboard")}</LinkButton>
          ) : (
            <LinkButton href="/login" variant="secondary" className="hidden sm:inline-flex">{t("landing.ctaLogin")}</LinkButton>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
          <div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">{t("landing.heroTitle")}</h1>
            <p className="mt-4 text-lg text-muted">{t("landing.heroBody")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {loggedIn ? (
                <LinkButton href="/dashboard">{t("nav.dashboard")}</LinkButton>
              ) : (
                <>
                  <LinkButton href="/signup">{t("landing.ctaSignup")}</LinkButton>
                  <LinkButton href="/login" variant="secondary">{t("landing.ctaLogin")}</LinkButton>
                </>
              )}
            </div>
            <p className="mt-4 text-xs text-muted">{t("disclaimer.short")}</p>
          </div>
          <Card className="mx-auto w-full max-w-md">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold">HbA1c</p>
              <span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs font-medium text-ok">{t("flags.normal")}</span>
            </div>
            <p className="text-sm text-muted">{t("dashboard.kinds.trend")}</p>
            <div className="mt-3"><PreviewChart /></div>
            <p className="mt-2 text-sm">
              <span className="font-medium">{t("dashboard.insights")}:</span> HbA1c 7.4% → 5.6% · Vitamin D ↑ · LDL ↓
            </p>
          </Card>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-2xl font-semibold">{t("landing.featuresTitle")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {m.landing.features.map((f) => (
              <Card key={f.title}>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-surface py-12">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold">{t("landing.privacyTitle")}</h2>
              <ul className="mt-4 space-y-3">
                {m.landing.privacy.map((p) => (
                  <li key={p} className="flex gap-3 text-sm">
                    <span aria-hidden className="mt-1 inline-block h-4 w-4 shrink-0 rounded-full bg-primary-soft text-center text-[10px] leading-4 text-primary">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{t("landing.stepsTitle")}</h2>
              <ol className="mt-4 space-y-4">
                {m.landing.steps.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-fg">{i + 1}</span>
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-sm text-muted">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold">{t("landing.indiaTitle")}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {m.landing.india.map((x) => (
              <li key={x} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm">{x}</li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{t("disclaimer.short")} {t("disclaimer.emergency")}</p>
          <nav className="flex gap-4">
            <Link href="/privacy" className="hover:underline">{t("landing.privacyLink")}</Link>
            <Link href="/terms" className="hover:underline">{t("landing.termsLink")}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
