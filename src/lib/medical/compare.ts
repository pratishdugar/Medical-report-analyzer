import { getBiomarker } from "./biomarkers";

export type CompareObs = {
  code: string | null;
  name: string;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  flag: string;
};

export type Verdict = "improved" | "worsened" | "same" | "only";

export type CompareRow = {
  key: string;
  code: string | null;
  name: string;
  a: CompareObs | null;
  b: CompareObs | null;
  delta: number | null;
  pct: number | null;
  verdict: Verdict;
};

/** Distance outside the normal range (0 when inside). */
export function outside(o: CompareObs): number {
  if (o.valueNum === null) return 0;
  if (o.refLow !== null && o.valueNum < o.refLow) return o.refLow - o.valueNum;
  if (o.refHigh !== null && o.valueNum > o.refHigh) return o.valueNum - o.refHigh;
  return 0;
}

export function verdictFor(code: string | null, a: CompareObs, b: CompareObs): Verdict {
  if (a.valueNum === null || b.valueNum === null) {
    if (a.flag === b.flag) return "same";
    return b.flag === "normal" ? "improved" : a.flag === "normal" ? "worsened" : "same";
  }
  const bm = getBiomarker(code);
  const delta = b.valueNum - a.valueNum;
  const minDelta = bm?.delta ?? Math.abs(a.valueNum) * 0.05;
  if (Math.abs(delta) < minDelta || delta === 0) return "same";
  const d0 = outside(a);
  const d1 = outside(b);
  if (d0 !== d1) return d1 < d0 ? "improved" : "worsened";
  // Both inside (or equally outside) the range: use the marker's preferred direction.
  if (bm?.better === "lower") return delta < 0 ? "improved" : "worsened";
  if (bm?.better === "higher") return delta > 0 ? "improved" : "worsened";
  return "same";
}

/** Match results of two reports by biomarker (or printed name) and classify each change. */
export function compareReports(older: CompareObs[], newer: CompareObs[]): CompareRow[] {
  const keyOf = (o: CompareObs) => o.code ?? `name:${o.name.trim().toLowerCase()}`;
  const mapA = new Map(older.map((o) => [keyOf(o), o]));
  const mapB = new Map(newer.map((o) => [keyOf(o), o]));
  const keys = [...new Set([...mapB.keys(), ...mapA.keys()])];
  const rows = keys.map((key): CompareRow => {
    const a = mapA.get(key) ?? null;
    const b = mapB.get(key) ?? null;
    const any = (b ?? a)!;
    if (!a || !b) return { key, code: any.code, name: any.name, a, b, delta: null, pct: null, verdict: "only" };
    const delta = a.valueNum !== null && b.valueNum !== null ? b.valueNum - a.valueNum : null;
    const pct = delta !== null && a.valueNum ? (delta / Math.abs(a.valueNum)) * 100 : null;
    return { key, code: any.code, name: any.name, a, b, delta, pct, verdict: verdictFor(any.code, a, b) };
  });
  const rank: Record<Verdict, number> = { worsened: 0, improved: 1, same: 2, only: 3 };
  return rows.sort((x, y) => rank[x.verdict] - rank[y.verdict]);
}
