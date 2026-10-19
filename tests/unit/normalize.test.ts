import { describe, expect, it } from "vitest";
import { matchBiomarker, normalizeTest } from "@/lib/medical/normalize";
import { normalizeUnit, parseNumber, parseRange, parseReportDate, parseValue } from "@/lib/medical/units";
import { bmi, egfrCkdEpi2021 } from "@/lib/medical/derived";

describe("number & value parsing", () => {
  it("handles Indian digit grouping and decimal commas", () => {
    expect(parseNumber("1,50,000")).toBe(150000);
    expect(parseNumber("2,50,000")).toBe(250000);
    expect(parseNumber("13.5")).toBe(13.5);
    expect(parseNumber("13,5")).toBe(13.5);
    expect(parseNumber("abc")).toBeNull();
  });
  it("extracts flags and qualifiers", () => {
    expect(parseValue("18.2 L")).toMatchObject({ num: 18.2, flagHint: "L" });
    expect(parseValue("245H")).toMatchObject({ num: 245, flagHint: "H" });
    expect(parseValue("<0.5")).toMatchObject({ num: 0.5, qualifier: "<" });
    expect(parseValue("Nil")).toMatchObject({ num: null, text: "Nil" });
    expect(parseValue("2-3")).toMatchObject({ num: 3, text: "2-3" });
  });
});

describe("units & ranges", () => {
  it("normalises unit spellings", () => {
    expect(normalizeUnit("Lakhs/cumm")).toBe("lakh/ul");
    expect(normalizeUnit("µIU/mL")).toBe("uiu/ml");
    expect(normalizeUnit("mIU/L")).toBe("uiu/ml");
    expect(normalizeUnit("x10³/µL")).toBe("10^3/ul");
    expect(normalizeUnit("cells/cumm")).toBe("/ul");
    expect(normalizeUnit("10^9/L")).toBe("10^3/ul");
    expect(normalizeUnit("mill/cumm")).toBe("10^6/ul");
    expect(normalizeUnit("gm/dl")).toBe("g/dl");
    expect(normalizeUnit("mmol/L")).toBe("mmol/l");
  });
  it("parses reference ranges", () => {
    expect(parseRange("13.0 - 17.0")).toMatchObject({ low: 13, high: 17 });
    expect(parseRange("< 200")).toMatchObject({ low: null, high: 200 });
    expect(parseRange("Upto 40")).toMatchObject({ high: 40 });
    expect(parseRange(">= 40")).toMatchObject({ low: 40 });
    expect(parseRange("1.5 to 4.5")).toMatchObject({ low: 1.5, high: 4.5 });
  });
  it("parses dates day-first", () => {
    expect(parseReportDate("05/03/2026")).toBe("2026-03-05");
    expect(parseReportDate("Collected: 15-Mar-2026 09:10")).toBe("2026-03-15");
    expect(parseReportDate("2026-01-20")).toBe("2026-01-20");
    expect(parseReportDate("13/25/2026")).toBeNull();
    expect(parseReportDate("31/02/2026")).toBeNull();
  });
});

describe("biomarker matching", () => {
  it.each([
    ["Haemoglobin", "HB"],
    ["HbA1c (Glycosylated Haemoglobin)", "HBA1C"],
    ["Mean Corpuscular Haemoglobin (MCH)", "MCH"],
    ["Mean Corpuscular Hb Concentration (MCHC)", "MCHC"],
    ["S. Creatinine", "CREAT"],
    ["SGPT (ALT)", "ALT"],
    ["Glucose, Fasting (F)", "GLU_F"],
    ["Blood Sugar PP", "GLU_PP"],
    ["Total Leucocyte Count (TLC)", "WBC"],
    ["25-OH Vitamin D (Total)", "VITD"],
    ["Vitamin B12", "VITB12"],
    ["TSH (Ultrasensitive)", "TSH"],
    ["Cholesterol, Total (CHOD-PAP)", "CHOL"],
    ["HDL Cholesterol - Direct", "HDL"],
    ["Non HDL Cholesterol", "NONHDL"],
    ["Total Cholesterol/HDL Ratio", "CHOL_HDL"],
    ["LDL/HDL Ratio", "LDL_HDL"],
    ["Platelet Count", "PLT"],
    ["T3, Total", "T3"],
    ["Potassium", "K"],
  ])("%s -> %s", (name, code) => {
    expect(matchBiomarker(name)).toBe(code);
  });
  it("does not map Vitamin K to potassium", () => {
    expect(matchBiomarker("Vitamin K")).toBeNull();
  });
});

describe("normalizeTest", () => {
  it("converts platelets in lakhs to 10^3/uL and flags correctly", () => {
    const o = normalizeTest({ name: "Platelet Count", value: "1.2", unit: "Lakhs/cumm", range: "1.5 - 4.5" })!;
    expect(o.code).toBe("PLT");
    expect(o.valueNum).toBe(120);
    expect(o.refLow).toBe(150);
    expect(o.refHigh).toBe(450);
    expect(o.flag).toBe("low");
  });
  it("converts mmol/L glucose", () => {
    const o = normalizeTest({ name: "Fasting Plasma Glucose", value: "7.0", unit: "mmol/L" })!;
    expect(o.code).toBe("GLU_F");
    expect(Math.round(o.valueNum!)).toBe(126);
    expect(o.flag).toBe("high");
  });
  it("uses sex specific default ranges", () => {
    const f = normalizeTest({ name: "Hemoglobin", value: "12.5", unit: "g/dL" }, { sex: "female" })!;
    const m = normalizeTest({ name: "Hemoglobin", value: "12.5", unit: "g/dL" }, { sex: "male" })!;
    expect(f.flag).toBe("normal");
    expect(m.flag).toBe("low");
  });
  it("marks critical values", () => {
    expect(normalizeTest({ name: "Potassium", value: "6.8", unit: "mmol/L" })!.flag).toBe("critical_high");
  });
  it("redirects qualitative urine values", () => {
    const o = normalizeTest({ name: "Albumin", value: "Nil" })!;
    expect(o.code).toBe("U_PROTEIN");
    expect(o.flag).toBe("normal");
    const g = normalizeTest({ name: "Glucose", value: "Trace" })!;
    expect(g.code).toBe("U_GLUCOSE");
    expect(g.flag).toBe("abnormal");
  });
  it("maps absolute differential counts", () => {
    expect(normalizeTest({ name: "Neutrophils", value: "4500", unit: "cells/cumm" })!.code).toBe("ANC");
    expect(normalizeTest({ name: "Neutrophils", value: "62", unit: "%" })!.code).toBe("NEUT");
  });
  it("rejects matches with incompatible units", () => {
    const o = normalizeTest({ name: "CA 125", value: "20", unit: "U/mL" })!;
    expect(o.code).toBeNull();
  });
  it("keeps unknown tests with report flags", () => {
    const o = normalizeTest({ name: "Amylase", value: "150", unit: "U/L", range: "28 - 100" })!;
    expect(o.code).toBeNull();
    expect(o.flag).toBe("high");
  });
  it("handles HbA1c in mmol/mol", () => {
    const o = normalizeTest({ name: "HbA1c", value: "53", unit: "mmol/mol" })!;
    expect(o.valueNum).toBeCloseTo(7.0, 1);
  });
});

describe("derived metrics", () => {
  it("computes eGFR (CKD-EPI 2021)", () => {
    expect(egfrCkdEpi2021(1.0, 50, "male")).toBe(92);
    expect(egfrCkdEpi2021(1.0, 50, "female")).toBe(69);
  });
  it("computes BMI", () => {
    expect(bmi(70, 170)).toBe(24.2);
  });
});
