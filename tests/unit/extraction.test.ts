import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetEnvCache } from "@/lib/env";
import { extractJson } from "@/lib/extraction/llm";
import { extractDocument, looksLikeOcrSlip, verifyAgainstText } from "@/lib/extraction/pipeline";
import { chunkText } from "@/lib/extraction/prompt";
import { redactPII } from "@/lib/extraction/redact";
import { parseLabLine, parseLabText } from "@/lib/extraction/rules";
import { extractPdfText, itemsToLines } from "@/lib/extraction/text";
import { normalizeTest } from "@/lib/medical/normalize";
import { numbersIn } from "@/lib/medical/units";

const SAMPLE_TEXT = `Sanjeevani Diagnostics Pvt. Ltd.
Patient Name : Ramesh Kumar Sharma    UHID : SDX-2291877
Age / Sex : 46 Years / Male    Mobile : 9876543210
Ref. By : Dr. Anil Mehta    Sample Collected On : 12/01/2026 08:15 AM
Haemoglobin (Hb)    12.1 L    g/dL    13.0 - 17.0
Platelet Count    2.1    Lakhs/cumm    1.5 - 4.1
Glucose Fasting (FBS)    118 H    mg/dL    70 - 100
25-OH Vitamin D (Total)    14.2 L    ng/mL    30 - 100
Albumin    Nil
Email: ramesh.sharma@example.com  ABHA: 12-3456-7890-1234`;

describe("rule-based parser", () => {
  it("parses Indian lab report lines", () => {
    const r = parseLabText(SAMPLE_TEXT);
    expect(r.reportDate).toBe("2026-01-12");
    expect(r.patientSex).toBe("male");
    expect(r.patientAge).toBe(46);
    const byCode = Object.fromEntries(r.tests.map((t) => [t.code, t]));
    expect(byCode.HB).toMatchObject({ value: "12.1", unit: "g/dL", range: "13.0 - 17.0", flag: "L" });
    expect(byCode.PLT).toMatchObject({ value: "2.1", unit: "Lakhs/cumm" });
    expect(byCode.VITD.value).toBe("14.2");
    expect(byCode.ALB?.value ?? byCode.U_PROTEIN?.value).toBe("Nil");
  });

  it("keeps digits that belong to the test name", () => {
    expect(parseLabLine("Vitamin D 25 Hydroxy    18.2    ng/mL    30 - 100")).toMatchObject({ code: "VITD", value: "18.2" });
  });

  it("ignores lines that are not results", () => {
    expect(parseLabLine("Sample Collected On : 12/01/2026 08:15 AM")).toBeNull();
    expect(parseLabLine("Age : 46 Years")).toBeNull();
  });

  it("extracts every row from the generated sample PDF", async () => {
    const pdf = await readFile("samples/sample-report-jan-2026.pdf");
    const { text } = await extractPdfText(pdf);
    const r = parseLabText(text);
    expect(r.tests.length).toBeGreaterThanOrEqual(25);
    const plt = normalizeTest(r.tests.find((t) => t.code === "PLT")!, { sex: "male" });
    expect(plt?.valueNum).toBe(210);
  });

  it("rebuilds table rows from positioned PDF text items", () => {
    const lines = itemsToLines([
      { str: "Haemoglobin", x: 10, y: 700, width: 60, height: 10, fontSize: 10 },
      { str: "12.1", x: 300, y: 700.5, width: 20, height: 10, fontSize: 10 },
      { str: "g/dL", x: 380, y: 699.8, width: 20, height: 10, fontSize: 10 },
      { str: "Next row", x: 10, y: 680, width: 40, height: 10, fontSize: 10 },
    ]);
    expect(lines[0]).toMatch(/^Haemoglobin\s{2,}12\.1\s{2,}g\/dL$/);
    expect(lines[1]).toBe("Next row");
  });
});

describe("PII redaction before sending text to third-party AI", () => {
  const { text } = redactPII(SAMPLE_TEXT, { names: ["Ramesh Kumar Sharma"], emails: ["ramesh.sharma@example.com"] });
  it("removes names, IDs, phone, email, doctor", () => {
    for (const secret of ["Ramesh", "Sharma", "SDX-2291877", "9876543210", "ramesh.sharma@example.com", "Anil Mehta", "12-3456-7890-1234"]) {
      expect(text).not.toContain(secret);
    }
  });
  it("keeps lab values, units, ranges, age and sex", () => {
    for (const keep of ["12.1", "g/dL", "13.0 - 17.0", "Lakhs/cumm", "118", "46 Years / Male", "12/01/2026"]) {
      expect(text).toContain(keep);
    }
  });
  it("does not mangle urine pH or platelet values", () => {
    expect(redactPII("pH : 6.0\nPlatelet Count - 250000").text).toBe("pH : 6.0\nPlatelet Count - 250000");
  });
});

describe("anti-hallucination checks", () => {
  const nums = numbersIn("Platelets 1,50,000 /cumm  Hb 13.50 g/dL");
  it("verifies values present in the source, including Indian grouping", () => {
    expect(verifyAgainstText("150000", nums, "")).toBe(true);
    expect(verifyAgainstText("13.5", nums, "")).toBe(true);
    expect(verifyAgainstText("14.2", nums, "")).toBe(false);
  });
  it("flags likely OCR decimal slips", () => {
    expect(looksLikeOcrSlip(normalizeTest({ name: "Vitamin D", value: "315", unit: "ng/mL", range: "30 - 100" })!)).toBe(true);
    expect(looksLikeOcrSlip(normalizeTest({ name: "Vitamin D", value: "31.5", unit: "ng/mL", range: "30 - 100" })!)).toBe(false);
  });
  it("ignores printed ranges that are wildly off (OCR '15-41' lakhs)", () => {
    const o = normalizeTest({ name: "Platelet Count", value: "2.4", unit: "Lakhs/cumm", range: "15-41" })!;
    expect(o.refLow).toBe(150);
    expect(o.flag).toBe("normal");
  });
});

describe("LLM helpers", () => {
  it("extracts JSON from fenced or chatty output", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Sure! {"a":2} hope that helps')).toEqual({ a: 2 });
    expect(() => extractJson("no json here")).toThrow();
  });
  it("chunks long text on line boundaries", () => {
    const text = Array.from({ length: 100 }, (_, i) => `line ${i} ${"x".repeat(50)}`).join("\n");
    const { chunks, truncated } = chunkText(text, 1000, 3);
    expect(chunks).toHaveLength(3);
    expect(truncated).toBe(true);
    expect(chunks.every((c) => c.length <= 1000)).toBe(true);
  });
});

describe("extraction pipeline with a (mocked) free LLM", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GROQ_API_KEY;
    resetEnvCache();
  });

  async function run(aiConsent: boolean, llmTests: unknown[]) {
    process.env.GROQ_API_KEY = "test-key";
    resetEnvCache();
    const bodies: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body));
      const content = JSON.stringify({ document_type: "lab_report", lab_name: "Sanjeevani Diagnostics", collection_date: "12/01/2026", tests: llmTests });
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
    }));
    const pdf = await readFile("samples/sample-report-jan-2026.pdf");
    const result = await extractDocument({
      data: pdf,
      mime: "application/pdf",
      aiConsent,
      redactNames: ["Ramesh Kumar Sharma"],
      redactEmails: [],
      profileSex: "male",
      profileAge: 46,
    });
    return { result, bodies };
  }

  it("sends only redacted text and verifies values against the document", async () => {
    const { result, bodies } = await run(true, [
      { name: "Haemoglobin", value: "12.1", unit: "g/dL", reference_range: "13.0 - 17.0", flag: "L", code: "HB" },
      { name: "Serum Ferritin", value: "88", unit: "ng/mL", reference_range: "30 - 400", flag: null, code: "FERRITIN" },
    ]);
    expect(bodies.length).toBeGreaterThan(0);
    for (const b of bodies) {
      expect(b).not.toContain("Ramesh");
      expect(b).not.toContain("9876543210");
      expect(b).not.toContain("SDX-2291877");
    }
    expect(result.method).toBe("llm:groq/llama-3.3-70b-versatile");
    expect(result.labName).toBe("Sanjeevani Diagnostics");
    const hb = result.observations.find((o) => o.code === "HB")!;
    expect(hb.verified).toBe(true);
    // 88 does not appear anywhere in the report: a hallucination must be marked unverified.
    const ferritin = result.observations.find((o) => o.code === "FERRITIN")!;
    expect(ferritin.verified).toBe(false);
    expect(result.warnings).toContain("unverified_values");
    // Rule-based rows back-fill anything the model missed.
    expect(result.observations.find((o) => o.code === "HBA1C")?.valueNum).toBe(6.4);
  });

  it("never calls a third-party provider without consent", async () => {
    const { result, bodies } = await run(false, []);
    expect(bodies).toHaveLength(0);
    expect(result.method).toBe("rules");
    expect(result.observations.length).toBeGreaterThanOrEqual(25);
  });

  it("falls back to the offline parser when the provider fails", async () => {
    process.env.GROQ_API_KEY = "test-key";
    resetEnvCache();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429 })));
    const pdf = await readFile("samples/sample-report-jan-2026.pdf");
    const result = await extractDocument({ data: pdf, mime: "application/pdf", aiConsent: true, redactNames: [], redactEmails: [], profileSex: "male", profileAge: 46 });
    expect(result.method).toBe("rules");
    expect(result.warnings).toContain("ai_unavailable");
    expect(result.observations.length).toBeGreaterThanOrEqual(25);
  });
});
