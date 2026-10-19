/**
 * Generates fictional sample lab reports (PDF + scanned PNG) in Indian lab
 * report style for demos and tests. Patient and lab are made up.
 *   npx tsx scripts/make-samples.ts
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

type Row = [name: string, value: string, unit: string, range: string, flag?: string];
type Section = { title: string; rows: Row[] };

const patient = { name: "Ramesh Kumar Sharma", age: "46 Years", sex: "Male", phone: "9876543210", uhid: "SDX-2291877" };

function html(opts: { collected: string; reported: string; sections: Section[] }) {
  const rows = opts.sections
    .map(
      (s) => `<tr class="sec"><td colspan="4">${s.title}</td></tr>` +
        s.rows
          .map(([n, v, u, r, f]) => `<tr><td>${n}</td><td class="${f ? "flag" : ""}">${v}${f ? ` ${f}` : ""}</td><td>${u}</td><td>${r}</td></tr>`)
          .join(""),
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;font-size:12px;margin:28px;color:#111}
    .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #0b6e4f;padding-bottom:8px}
    .lab{font-size:20px;font-weight:bold;color:#0b6e4f}
    table.meta td{padding:2px 14px 2px 0}
    table.res{width:100%;border-collapse:collapse;margin-top:14px}
    table.res th{text-align:left;border-bottom:1px solid #444;padding:6px 4px}
    table.res td{padding:5px 4px}
    tr.sec td{font-weight:bold;background:#eef6f2;padding-top:10px}
    .flag{font-weight:bold}
    .foot{margin-top:30px;font-size:11px;color:#444}
  </style></head><body>
  <div class="hdr"><div><div class="lab">Sanjeevani Diagnostics Pvt. Ltd.</div><div>NABL Accredited Laboratory · 12 MG Road, Pune - 411001 · Ph: 020 24567890</div></div></div>
  <table class="meta"><tr><td>Patient Name : ${patient.name}</td><td>UHID : ${patient.uhid}</td></tr>
  <tr><td>Age / Sex : ${patient.age} / ${patient.sex}</td><td>Mobile : ${patient.phone}</td></tr>
  <tr><td>Ref. By : Dr. Anil Mehta</td><td>Sample Collected On : ${opts.collected}</td></tr>
  <tr><td>Sample Type : Serum, EDTA Whole Blood</td><td>Reported On : ${opts.reported}</td></tr></table>
  <table class="res"><thead><tr><th>Test Name</th><th>Result</th><th>Unit</th><th>Bio. Ref. Interval</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="foot">*** End of Report *** · Dr. Kavita Rao, MD (Pathology) · This is a computer generated report.</div>
  </body></html>`;
}

const jan: Section[] = [
  { title: "HAEMATOLOGY - COMPLETE BLOOD COUNT", rows: [
    ["Haemoglobin (Hb)", "12.1", "g/dL", "13.0 - 17.0", "L"],
    ["Total Leucocyte Count (TLC)", "7,800", "cells/cumm", "4,000 - 11,000"],
    ["RBC Count", "4.4", "mill/cumm", "4.5 - 5.5", "L"],
    ["PCV (Haematocrit)", "38.2", "%", "40 - 50", "L"],
    ["MCV", "76.4", "fL", "83 - 101", "L"],
    ["MCH", "25.1", "pg", "27 - 32", "L"],
    ["Neutrophils", "62", "%", "40 - 80"],
    ["Lymphocytes", "30", "%", "20 - 40"],
    ["Eosinophils", "5", "%", "1 - 6"],
    ["Platelet Count", "2.1", "Lakhs/cumm", "1.5 - 4.1"],
    ["ESR (Westergren)", "18", "mm/hr", "0 - 15", "H"],
  ]},
  { title: "BIOCHEMISTRY", rows: [
    ["Glucose Fasting (FBS)", "118", "mg/dL", "70 - 100", "H"],
    ["Glucose Post Prandial (PPBS)", "176", "mg/dL", "70 - 140", "H"],
    ["HbA1c (Glycosylated Haemoglobin)", "6.4", "%", "4.0 - 5.6", "H"],
    ["Cholesterol Total", "232", "mg/dL", "< 200", "H"],
    ["Triglycerides", "210", "mg/dL", "< 150", "H"],
    ["HDL Cholesterol", "36", "mg/dL", "> 40", "L"],
    ["LDL Cholesterol", "154", "mg/dL", "< 100", "H"],
    ["VLDL Cholesterol", "42", "mg/dL", "< 30", "H"],
    ["S. Creatinine", "1.02", "mg/dL", "0.7 - 1.3"],
    ["Blood Urea", "28", "mg/dL", "15 - 45"],
    ["Uric Acid", "7.8", "mg/dL", "3.5 - 7.2", "H"],
    ["SGPT (ALT)", "58", "U/L", "< 45", "H"],
    ["SGOT (AST)", "41", "U/L", "< 40", "H"],
  ]},
  { title: "VITAMINS & HORMONES", rows: [
    ["25-OH Vitamin D (Total)", "14.2", "ng/mL", "30 - 100", "L"],
    ["Vitamin B12", "182", "pg/mL", "211 - 911", "L"],
    ["TSH (Ultrasensitive)", "5.8", "µIU/mL", "0.35 - 5.50", "H"],
  ]},
];

const jul: Section[] = [
  { title: "HAEMATOLOGY - COMPLETE BLOOD COUNT", rows: [
    ["Haemoglobin (Hb)", "13.4", "g/dL", "13.0 - 17.0"],
    ["Total Leucocyte Count (TLC)", "7,200", "cells/cumm", "4,000 - 11,000"],
    ["RBC Count", "4.7", "mill/cumm", "4.5 - 5.5"],
    ["MCV", "82.0", "fL", "83 - 101", "L"],
    ["Platelet Count", "2.4", "Lakhs/cumm", "1.5 - 4.1"],
  ]},
  { title: "BIOCHEMISTRY", rows: [
    ["Glucose Fasting (FBS)", "104", "mg/dL", "70 - 100", "H"],
    ["HbA1c (Glycosylated Haemoglobin)", "5.9", "%", "4.0 - 5.6", "H"],
    ["Cholesterol Total", "198", "mg/dL", "< 200"],
    ["Triglycerides", "162", "mg/dL", "< 150", "H"],
    ["HDL Cholesterol", "41", "mg/dL", "> 40"],
    ["LDL Cholesterol", "125", "mg/dL", "< 100", "H"],
    ["S. Creatinine", "0.98", "mg/dL", "0.7 - 1.3"],
    ["Uric Acid", "6.9", "mg/dL", "3.5 - 7.2"],
    ["SGPT (ALT)", "39", "U/L", "< 45"],
  ]},
  { title: "VITAMINS & HORMONES", rows: [
    ["25-OH Vitamin D (Total)", "31.5", "ng/mL", "30 - 100"],
    ["Vitamin B12", "356", "pg/mL", "211 - 911"],
    ["TSH (Ultrasensitive)", "3.9", "µIU/mL", "0.35 - 5.50"],
  ]},
];

async function main() {
  await mkdir("samples", { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage();
  await page.setContent(html({ collected: "12/01/2026 08:15 AM", reported: "12/01/2026 06:40 PM", sections: jan }));
  await page.pdf({ path: "samples/sample-report-jan-2026.pdf", format: "A4" });
  await page.setContent(html({ collected: "18/07/2026 07:50 AM", reported: "18/07/2026 05:10 PM", sections: jul }));
  await page.pdf({ path: "samples/sample-report-jul-2026.pdf", format: "A4" });
  const scan = await browser.newPage({ deviceScaleFactor: 2.5, viewport: { width: 900, height: 1100 } });
  await scan.setContent(html({ collected: "18/07/2026 07:50 AM", reported: "18/07/2026 05:10 PM", sections: jul }));
  await scan.screenshot({ path: "samples/sample-report-jul-2026-scan.jpg", fullPage: true, type: "jpeg", quality: 80 });
  await browser.close();
  console.log("Samples written to ./samples");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
