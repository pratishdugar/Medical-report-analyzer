"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "./i18n-provider";
import { dateLocale } from "@/lib/i18n";

export type TrendPoint = { t: number; date: string; value: number; flag: string; source: string };

function fmtDate(ms: number, locale: string, withDay = false) {
  return new Date(ms).toLocaleDateString(locale, { day: withDay ? "numeric" : undefined, month: "short", year: "2-digit", timeZone: "UTC" });
}

const markerColor = (flag: string) =>
  flag === "normal" || flag === "unknown" ? "var(--series-1)" : flag === "low" ? "var(--warn)" : "var(--bad)";

/**
 * Single-biomarker trend: 2px line, ringed markers (out-of-range markers in
 * status colour, with the status named in the tooltip and table), normal
 * range as a light band, crosshair tooltip. The readings table below the
 * chart is its accessible twin.
 */
export function TrendChart({ points, low, high, unit, decimals, name }: {
  points: TrendPoint[];
  low: number | null;
  high: number | null;
  unit: string;
  decimals: number;
  name: string;
}) {
  const { t, locale } = useI18n();
  const loc = dateLocale(locale);
  const values = points.map((p) => p.value);
  const minV = Math.min(...values, low ?? Infinity);
  const maxV = Math.max(...values, high ?? -Infinity);
  const pad = (maxV - minV || Math.abs(maxV) || 1) * 0.15;
  const domain: [number, number] = [Math.max(0, minV - pad), maxV + pad];
  const fmt = (v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: decimals });
  const single = points.length === 1;
  const xDomain: [number, number] = single
    ? [points[0].t - 30 * 86400000, points[0].t + 30 * 86400000]
    : [points[0].t, points[points.length - 1].t];

  const TooltipBody = ({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as TrendPoint;
    return (
      <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-md">
        <p className="font-semibold tabular">
          {fmt(p.value)} <span className="font-normal text-muted">{unit}</span>
        </p>
        <p className="text-xs text-muted">{fmtDate(p.t, loc, true)} · {p.source === "manual" ? t("trends.manual") : t("trends.fromReport")}</p>
        {p.flag !== "unknown" && <p className="text-xs">{t(`flags.${p.flag}`)}</p>}
      </div>
    );
  };

  return (
    <figure aria-label={name}>
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 16, right: 24, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
            {(low !== null || high !== null) && (
              <ReferenceArea
                y1={low ?? domain[0]}
                y2={high ?? domain[1]}
                fill="var(--chart-band)"
                fillOpacity={1}
                stroke="none"
                ifOverflow="extendDomain"
              />
            )}
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={xDomain}
              tickFormatter={(v: number) => fmtDate(v, loc)}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--chart-grid)" }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={domain}
              tickFormatter={(v: number) => fmt(v)}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={48}
              className="tabular"
            />
            <Tooltip content={TooltipBody} cursor={{ stroke: "var(--muted)", strokeWidth: 1 }} isAnimationActive={false} />
            <Line
              dataKey="value"
              type="linear"
              stroke="var(--series-1)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; payload?: TrendPoint; index?: number }) => (
                <circle
                  key={props.index}
                  cx={props.cx}
                  cy={props.cy}
                  r={5}
                  fill={markerColor(props.payload?.flag ?? "unknown")}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              )}
              activeDot={{ r: 7, stroke: "var(--surface)", strokeWidth: 2, fill: "var(--series-1)" }}
              label={(props: { x?: number | string; y?: number | string; index?: number; value?: unknown }) =>
                props.index === points.length - 1 ? (
                  <text key="end" x={Number(props.x)} y={Number(props.y) - 12} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--fg)">
                    {fmt(Number(props.value))}
                  </text>
                ) : (
                  <g key={props.index} />
                )
              }
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {(low !== null || high !== null) && (
        <figcaption className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span className="inline-block h-3 w-5 rounded-sm" style={{ background: "var(--chart-band)" }} aria-hidden />
          {t("trends.reference")}: {low !== null ? fmt(low) : "–"} – {high !== null ? fmt(high) : "–"} {unit}
        </figcaption>
      )}
    </figure>
  );
}
