/*
 * Small server-renderable visualisations (no JS needed).
 * Chart rules: 2px lines, ≥8px markers with a 2px surface ring, ~10% range
 * band wash, hairline solid grid, text in text tokens (never series colour).
 */

type Point = { x: number; y: number };

/** 12-point max sparkline: de-emphasis line, latest point in the accent. */
export function Sparkline({ values, low, high, width = 120, height = 36, label }: {
  values: number[];
  low?: number | null;
  high?: number | null;
  width?: number;
  height?: number;
  label: string;
}) {
  const vals = values.slice(-12);
  if (vals.length < 2) return null;
  const pad = 5;
  const lo = Math.min(...vals, low ?? Infinity);
  const hi = Math.max(...vals, high ?? -Infinity);
  const span = hi - lo || 1;
  const sy = (v: number) => height - pad - ((v - lo) / span) * (height - pad * 2);
  const pts: Point[] = vals.map((v, i) => ({ x: pad + (i / (vals.length - 1)) * (width - pad * 2), y: sy(v) }));
  const bandTop = high != null ? sy(Math.min(high, hi)) : pad;
  const bandBottom = low != null ? sy(Math.max(low, lo)) : height - pad;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="overflow-visible">
      {(low != null || high != null) && bandBottom > bandTop && (
        <rect x={0} y={bandTop} width={width} height={bandBottom - bandTop} fill="var(--chart-band)" />
      )}
      <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="var(--series-muted)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={4} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}

/**
 * Where a value sits relative to its normal range. The normal band occupies
 * the middle of the track; the marker is clamped to the track ends.
 */
export function RangeMeter({ value, low, high, flag, width = 140, label }: {
  value: number | null;
  low: number | null;
  high: number | null;
  flag: string;
  width?: number;
  label: string;
}) {
  if (value === null || (low === null && high === null)) return null;
  const h = 14;
  // Map the normal range to 30%–70% of the track (one-sided ranges get a half-track).
  const lo = low ?? (high! > 0 ? 0 : high! - Math.abs(high!));
  let hi = high ?? low! * 2;
  if (hi <= lo) hi = lo + 1;
  const bandStart = low === null ? 0.05 : 0.3;
  const bandEnd = high === null ? 0.95 : 0.7;
  const scale = (v: number) => bandStart + ((v - lo) / (hi - lo)) * (bandEnd - bandStart);
  const pos = Math.min(0.97, Math.max(0.03, scale(value)));
  const color = flag === "normal" ? "var(--ok)" : flag === "low" ? "var(--warn)" : flag === "unknown" ? "var(--series-1)" : "var(--bad)";
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} role="img" aria-label={label} className="shrink-0">
      <rect x={0} y={h / 2 - 2} width={width} height={4} rx={2} fill="var(--chart-grid)" />
      <rect x={bandStart * width} y={h / 2 - 3} width={(bandEnd - bandStart) * width} height={6} rx={3} fill="var(--ok)" opacity={0.35} />
      <circle cx={pos * width} cy={h / 2} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}
