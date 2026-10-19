import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, Info, Sparkles, Stethoscope, TrendingDown, TrendingUp } from "lucide-react";
import type { Insight } from "@/lib/medical/insights";
import { pick, type Locale, type TFunction } from "@/lib/i18n";
import { Badge, cn } from "./ui";

const STYLE: Record<Insight["severity"], { tone: "bad" | "warn" | "ok" | "info"; border: string }> = {
  critical: { tone: "bad", border: "border-l-[var(--bad)]" },
  high: { tone: "bad", border: "border-l-[var(--bad)]" },
  moderate: { tone: "warn", border: "border-l-[var(--warn)]" },
  positive: { tone: "ok", border: "border-l-[var(--ok)]" },
  info: { tone: "info", border: "border-l-[var(--info)]" },
};

function Icon({ insight }: { insight: Insight }) {
  const cls = "mt-0.5 shrink-0";
  if (insight.severity === "critical" || insight.severity === "high") return <AlertTriangle size={18} className={cn(cls, "text-bad")} aria-hidden />;
  if (insight.kind === "trend") return insight.severity === "positive" ? <TrendingUp size={18} className={cn(cls, "text-ok")} aria-hidden /> : <TrendingDown size={18} className={cn(cls, "text-warn")} aria-hidden />;
  if (insight.kind === "reminder") return <Bell size={18} className={cn(cls, "text-info")} aria-hidden />;
  if (insight.kind === "screening") return <Stethoscope size={18} className={cn(cls, "text-info")} aria-hidden />;
  if (insight.severity === "positive") return <CheckCircle2 size={18} className={cn(cls, "text-ok")} aria-hidden />;
  if (insight.kind === "pattern") return <Sparkles size={18} className={cn(cls, "text-warn")} aria-hidden />;
  return <Info size={18} className={cn(cls, "text-warn")} aria-hidden />;
}

export function InsightList({ insights, locale, t, limit }: { insights: Insight[]; locale: Locale; t: TFunction; limit?: number }) {
  const list = limit ? insights.slice(0, limit) : insights;
  return (
    <ul className="space-y-3">
      {list.map((i) => (
        <li key={i.id} className={cn("rounded-lg border border-border border-l-4 bg-surface p-3", STYLE[i.severity].border)}>
          <div className="flex gap-3">
            <Icon insight={i} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{pick(i.title, locale)}</p>
                <Badge tone={STYLE[i.severity].tone}>{t(`dashboard.kinds.${i.kind}`)}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{pick(i.body, locale)}</p>
              {(i.tips?.length || i.action) && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-primary">{t("dashboard.showTips")}</summary>
                  {i.tips && (
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {i.tips.map((tip, idx) => <li key={idx}>{pick(tip, locale)}</li>)}
                    </ul>
                  )}
                  {i.action && <p className="mt-2 font-medium">{pick(i.action, locale)}</p>}
                </details>
              )}
              {i.code && (
                <Link href={`/trends/${i.code}`} className="mt-2 inline-block text-xs text-primary hover:underline">
                  {t("nav.trends")} →
                </Link>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
