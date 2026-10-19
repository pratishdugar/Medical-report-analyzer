import { describe, expect, it } from "vitest";
import { compareReports } from "@/lib/medical/compare";
import { computeInsights, type ObsLite } from "@/lib/medical/insights";

const obs = (code: string, value: number, date: string, flag = "normal", refLow: number | null = null, refHigh: number | null = null): ObsLite => ({
  id: `${code}-${date}`,
  code,
  name: code,
  valueNum: value,
  valueText: null,
  unit: null,
  refLow,
  refHigh,
  flag,
  observedAt: date,
});
const profile = { dateOfBirth: "1980-01-01", sex: "male", heightCm: 170, diet: "vegetarian" };

describe("insights", () => {
  const list = computeInsights(
    [
      obs("HBA1C", 7.2, "2025-06-01", "high", 4, 5.6),
      obs("HBA1C", 6.3, "2026-01-01", "high", 4, 5.6),
      obs("TG", 210, "2026-01-01", "high", null, 149),
      obs("HDL", 35, "2026-01-01", "low", 40, null),
      obs("GLU_F", 112, "2026-01-01", "high", 70, 99),
      obs("K", 6.6, "2026-01-01", "critical_high", 3.5, 5.1),
      obs("CREAT", 1.0, "2026-01-01", "normal", 0.7, 1.3),
      obs("WEIGHT", 80, "2026-01-01"),
    ],
    profile,
    "2026-10-19",
  );
  const ids = list.map((i) => i.id);

  it("puts critical results first with urgent advice", () => {
    expect(list[0].id).toBe("alert:K");
    expect(list[0].severity).toBe("critical");
    expect(list[0].action?.en).toMatch(/112|108/);
  });
  it("detects an improving HbA1c trend", () => {
    const t = list.find((i) => i.id === "trend:HBA1C")!;
    expect(t.severity).toBe("positive");
  });
  it("flags a metabolic-syndrome pattern", () => {
    expect(ids).toContain("pattern:metabolic");
  });
  it("derives eGFR and BMI with Asian-Indian cut-offs", () => {
    expect(ids).toContain("derived:EGFR");
    const bmi = list.find((i) => i.code === "BMI")!;
    expect(bmi.body.en).toMatch(/27\.7/);
    expect(bmi.severity).not.toBe("positive");
  });
  it("suggests B12 screening for vegetarians and retests when due", () => {
    expect(ids).toContain("screening:b12");
    expect(ids).toContain("reminder:HBA1C");
  });
  it("provides Hindi text for every insight", () => {
    expect(list.every((i) => i.title.hi && i.body.hi)).toBe(true);
  });
});

describe("report comparison", () => {
  const base = { unit: null, valueText: null };
  const rows = compareReports(
    [
      { ...base, code: "LDL", name: "LDL", valueNum: 160, refLow: null, refHigh: 99, flag: "high" },
      { ...base, code: "HB", name: "Hb", valueNum: 13.5, refLow: 13, refHigh: 17, flag: "normal" },
      { ...base, code: "VITD", name: "Vit D", valueNum: 35, refLow: 30, refHigh: 100, flag: "normal" },
    ],
    [
      { ...base, code: "LDL", name: "LDL", valueNum: 110, refLow: null, refHigh: 99, flag: "high" },
      { ...base, code: "HB", name: "Hb", valueNum: 13.6, refLow: 13, refHigh: 17, flag: "normal" },
      { ...base, code: "VITD", name: "Vit D", valueNum: 18, refLow: 30, refHigh: 100, flag: "low" },
      { ...base, code: "TSH", name: "TSH", valueNum: 2, refLow: 0.4, refHigh: 4.5, flag: "normal" },
    ],
  );
  const v = Object.fromEntries(rows.map((r) => [r.code, r.verdict]));
  it("classifies changes relative to the normal range", () => {
    expect(v).toEqual({ LDL: "improved", HB: "same", VITD: "worsened", TSH: "only" });
  });
  it("lists worsened results first", () => {
    expect(rows[0].code).toBe("VITD");
  });
});
