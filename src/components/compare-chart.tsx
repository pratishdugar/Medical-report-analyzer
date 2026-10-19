import type { CompareRow } from "@/lib/medical/compare";

/*
 * Dumbbell rows: for each test, the normal range is the green band in the
 * middle of a track; the earlier value is a hollow orange ring, the later a
 * filled blue dot, joined by a line. Values are placed relative to their own
 * range so different units share one visual scale. The table below is the
 * accessible twin with exact numbers.
 */
export function CompareChart({ rows, labels }: { rows: (CompareRow & { label: string; aText: string; bText: string })[]; labels: { older: string; newer: string; normal: string } }) {
  const W = 300;
  const H = 22;
  const pos = (v: number, low: number | null, high: number | null) => {
    const lo = low ?? (high! > 0 ? 0 : high! - Math.abs(high!));
    const hi = high ?? (low! || 1) * 2;
    const start = low === null ? 0.05 : 0.3;
    const end = high === null ? 0.95 : 0.7;
    const p = start + ((v - lo) / (hi - lo || 1)) * (end - start);
    return Math.min(0.98, Math.max(0.02, p)) * W;
  };
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted" aria-hidden>
        <span className="flex items-center gap-1.5"><svg width="12" height="12"><circle cx="6" cy="6" r="4" fill="var(--surface)" stroke="var(--series-2)" strokeWidth="2" /></svg>{labels.older}</span>
        <span className="flex items-center gap-1.5"><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="var(--series-1)" /></svg>{labels.newer}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-5 rounded-sm bg-ok/35" />{labels.normal}</span>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => {
          const a = r.a!;
          const b = r.b!;
          const low = b.refLow ?? a.refLow;
          const high = b.refHigh ?? a.refHigh;
          const xa = pos(a.valueNum!, low, high);
          const xb = pos(b.valueNum!, low, high);
          const bandStart = (low === null ? 0.05 : 0.3) * W;
          const bandEnd = (high === null ? 0.95 : 0.7) * W;
          const lineColor = r.verdict === "improved" ? "var(--ok)" : r.verdict === "worsened" ? "var(--bad)" : "var(--muted)";
          return (
            <li key={r.key} className="grid grid-cols-[minmax(7rem,11rem)_1fr] items-center gap-3 text-sm">
              <span className="truncate" title={r.label}>{r.label}</span>
              <svg viewBox={`0 0 ${W} ${H}`} className="h-6 w-full" preserveAspectRatio="none" role="img" aria-label={`${r.label}: ${r.aText} → ${r.bText}`}>
                <title>{`${r.label}: ${r.aText} → ${r.bText}`}</title>
                <rect x={0} y={H / 2 - 1} width={W} height={2} fill="var(--chart-grid)" />
                <rect x={bandStart} y={H / 2 - 4} width={bandEnd - bandStart} height={8} rx={4} fill="var(--ok)" opacity={0.3} />
                <line x1={xa} y1={H / 2} x2={xb} y2={H / 2} stroke={lineColor} strokeWidth={2} strokeLinecap="round" />
                <circle cx={xa} cy={H / 2} r={4.5} fill="var(--surface)" stroke="var(--series-2)" strokeWidth={2} />
                <circle cx={xb} cy={H / 2} r={5.5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
              </svg>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
