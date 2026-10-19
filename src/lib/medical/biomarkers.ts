/*
 * Catalog of biomarkers commonly found on Indian lab reports.
 *
 * Default reference ranges are used only when a report doesn't print its own
 * range (the lab's own range always wins). Sources: ADA/ICMR diabetes
 * criteria, Lipid Association of India guidance, Endocrine Society (vitamin
 * D), WHO anaemia cut-offs, Indian hypertension guidelines (IGH-IV) and the
 * Asian-Indian BMI / waist consensus. These are general adult ranges and are
 * NOT a substitute for a clinician's interpretation.
 */

export type Sex = "male" | "female";
export type L = { en: string; hi: string };

export type CategoryId =
  | "diabetes"
  | "lipids"
  | "liver"
  | "kidney"
  | "thyroid"
  | "blood"
  | "iron"
  | "vitamins"
  | "electrolytes"
  | "inflammation"
  | "hormones"
  | "urine"
  | "vitals";

export const CATEGORIES: { id: CategoryId; label: L }[] = [
  { id: "diabetes", label: { en: "Blood sugar & diabetes", hi: "ब्लड शुगर और डायबिटीज़" } },
  { id: "lipids", label: { en: "Cholesterol & heart", hi: "कोलेस्ट्रॉल और हृदय" } },
  { id: "blood", label: { en: "Complete blood count", hi: "कम्प्लीट ब्लड काउंट (CBC)" } },
  { id: "vitamins", label: { en: "Vitamins", hi: "विटामिन" } },
  { id: "iron", label: { en: "Iron studies", hi: "आयरन जाँच" } },
  { id: "thyroid", label: { en: "Thyroid", hi: "थायरॉइड" } },
  { id: "kidney", label: { en: "Kidney function", hi: "किडनी फ़ंक्शन" } },
  { id: "liver", label: { en: "Liver function", hi: "लिवर फ़ंक्शन" } },
  { id: "electrolytes", label: { en: "Electrolytes & minerals", hi: "इलेक्ट्रोलाइट्स और खनिज" } },
  { id: "inflammation", label: { en: "Inflammation markers", hi: "सूजन संकेतक" } },
  { id: "hormones", label: { en: "Other markers", hi: "अन्य जाँचें" } },
  { id: "urine", label: { en: "Urine routine", hi: "पेशाब जाँच" } },
  { id: "vitals", label: { en: "Vitals & body measurements", hi: "वाइटल्स और शरीर माप" } },
];

export type RangeRule = { sex?: Sex; minAge?: number; maxAge?: number; low?: number; high?: number };
export type Band = { below?: number; label: L; level: "ok" | "watch" | "alert" };
type Conversion = number | ((v: number) => number);

export interface Biomarker {
  code: string;
  name: string;
  hi: string;
  category: CategoryId;
  /** display unit (canonical) */
  unit: string;
  /** normalised canonical unit key (see normalizeUnit) */
  unitKey: string;
  aliases: string[];
  ranges: RangeRule[];
  critical?: { low?: number; high?: number };
  /** which direction is an improvement for trend messages */
  better: "lower" | "higher" | "range" | "none";
  /** normalised unit -> factor (or function) converting INTO the canonical unit */
  convert?: Record<string, Conversion>;
  decimals: number;
  qualitativeNormal?: string[];
  /** biomarker to use instead when the printed value is qualitative (Nil/Trace…) */
  qualitativeAlt?: string;
  /** biomarker to use instead when a qualitative-only test has a numeric value */
  numericAlt?: string;
  /** biomarker to use instead when the unit is an absolute count (differential counts) */
  countAlt?: string;
  /** interpretation bands, ascending by `below`; last band has no `below` */
  bands?: Band[];
  /** retest interval in days: [if abnormal, if normal] */
  retest?: [number, number];
  /** smallest change considered meaningful for trend messages */
  delta?: number;
  info: L;
}

const MG = { unit: "mg/dL", unitKey: "mg/dl" } as const;
const CHOL_CONV = { "mmol/l": 38.67 };

const list: Biomarker[] = [
  // ───────────────────────── Diabetes ─────────────────────────
  {
    code: "GLU_F", name: "Fasting Blood Sugar", hi: "फ़ास्टिंग ब्लड शुगर", category: "diabetes", ...MG,
    aliases: ["fasting blood sugar", "fbs", "blood sugar fasting", "glucose fasting", "fasting glucose", "fasting plasma glucose",
      "fpg", "plasma glucose fasting", "glucose f", "blood glucose fasting", "sugar fasting", "glucose fasting plasma",
      "fasting blood glucose", "bsf", "fbg", "glucose fasting fbs", "plasma glucose f", "blood sugar f", "fasting sugar"],
    ranges: [{ low: 70, high: 99 }], critical: { low: 54, high: 400 }, better: "range", convert: { "mmol/l": 18.016 },
    qualitativeAlt: "U_GLUCOSE",
    decimals: 0, retest: [90, 365], delta: 10,
    bands: [
      { below: 70, label: { en: "Low", hi: "कम" }, level: "watch" },
      { below: 100, label: { en: "Normal", hi: "सामान्य" }, level: "ok" },
      { below: 126, label: { en: "Prediabetes range", hi: "प्री-डायबिटीज़ रेंज" }, level: "watch" },
      { label: { en: "Diabetes range", hi: "डायबिटीज़ रेंज" }, level: "alert" },
    ],
    info: { en: "Blood glucose after 8–10 hours without food.", hi: "8–10 घंटे बिना खाए खून में शुगर का स्तर।" },
  },
  {
    code: "GLU_PP", name: "Post-meal Blood Sugar (PPBS)", hi: "खाने के बाद ब्लड शुगर (PPBS)", category: "diabetes", ...MG,
    aliases: ["post prandial blood sugar", "ppbs", "pp blood sugar", "blood sugar pp", "glucose pp", "post prandial glucose",
      "glucose post prandial", "ppbg", "plasma glucose pp", "2 hr post prandial", "blood sugar post prandial",
      "glucose 2 hr pp", "pp sugar", "postprandial blood sugar", "postprandial glucose", "blood glucose pp",
      "post prandial plasma glucose", "glucose pp 2 hrs", "plasma glucose post prandial", "ppbs 2 hrs"],
    ranges: [{ low: 70, high: 139 }], critical: { low: 54, high: 400 }, better: "range", convert: { "mmol/l": 18.016 },
    qualitativeAlt: "U_GLUCOSE",
    decimals: 0, retest: [90, 365], delta: 15,
    bands: [
      { below: 140, label: { en: "Normal", hi: "सामान्य" }, level: "ok" },
      { below: 200, label: { en: "Prediabetes range", hi: "प्री-डायबिटीज़ रेंज" }, level: "watch" },
      { label: { en: "Diabetes range", hi: "डायबिटीज़ रेंज" }, level: "alert" },
    ],
    info: { en: "Blood glucose 2 hours after a meal.", hi: "खाने के 2 घंटे बाद खून में शुगर।" },
  },
  {
    code: "GLU_R", name: "Random Blood Sugar", hi: "रैंडम ब्लड शुगर", category: "diabetes", ...MG,
    aliases: ["random blood sugar", "rbs", "blood sugar random", "glucose random", "random glucose", "random plasma glucose",
      "rbg", "plasma glucose random", "blood glucose random", "random blood glucose", "glucose", "blood sugar", "blood glucose",
      "sugar", "plasma glucose"],
    ranges: [{ low: 70, high: 139 }], critical: { low: 54, high: 400 }, better: "range", convert: { "mmol/l": 18.016 },
    qualitativeAlt: "U_GLUCOSE",
    decimals: 0, retest: [90, 365], delta: 20,
    bands: [
      { below: 140, label: { en: "Normal", hi: "सामान्य" }, level: "ok" },
      { below: 200, label: { en: "Raised", hi: "बढ़ा हुआ" }, level: "watch" },
      { label: { en: "Diabetes range", hi: "डायबिटीज़ रेंज" }, level: "alert" },
    ],
    info: { en: "Blood glucose at any time of day.", hi: "दिन में किसी भी समय ब्लड शुगर।" },
  },
  {
    code: "HBA1C", name: "HbA1c", hi: "HbA1c (3 महीने की औसत शुगर)", category: "diabetes", unit: "%", unitKey: "%",
    aliases: ["hba1c", "glycosylated haemoglobin", "glycosylated hemoglobin", "glycated haemoglobin", "glycated hemoglobin",
      "hb a1c", "a1c", "haemoglobin a1c", "hemoglobin a1c", "glycosylated haemoglobin hba1c", "hba1c glycosylated haemoglobin",
      "glyco hb", "hba 1c"],
    ranges: [{ low: 4.0, high: 5.6 }], better: "lower", convert: { "mmol/mol": (v) => v / 10.929 + 2.15 },
    decimals: 1, retest: [90, 365], delta: 0.3,
    bands: [
      { below: 5.7, label: { en: "Normal", hi: "सामान्य" }, level: "ok" },
      { below: 6.5, label: { en: "Prediabetes range", hi: "प्री-डायबिटीज़ रेंज" }, level: "watch" },
      { label: { en: "Diabetes range", hi: "डायबिटीज़ रेंज" }, level: "alert" },
    ],
    info: { en: "Average blood sugar over the last ~3 months.", hi: "पिछले ~3 महीनों की औसत ब्लड शुगर।" },
  },
  {
    code: "EAG", name: "Estimated Average Glucose", hi: "अनुमानित औसत ग्लूकोज़", category: "diabetes", ...MG,
    aliases: ["estimated average glucose", "eag", "mean blood glucose", "average blood glucose", "mean plasma glucose",
      "estimated average glucose eag", "average glucose"],
    ranges: [{ high: 116 }], better: "lower", convert: { "mmol/l": 18.016 }, decimals: 0, delta: 10,
    info: { en: "Average glucose calculated from HbA1c.", hi: "HbA1c से निकाली गई औसत शुगर।" },
  },
  {
    code: "INSULIN_F", name: "Fasting Insulin", hi: "फ़ास्टिंग इंसुलिन", category: "diabetes", unit: "µIU/mL", unitKey: "uiu/ml",
    aliases: ["insulin fasting", "fasting insulin", "serum insulin fasting", "insulin f", "fasting serum insulin"],
    ranges: [{ low: 2, high: 25 }], better: "range", convert: { "pmol/l": 1 / 6 }, decimals: 1,
    info: { en: "Insulin level after fasting; high values can indicate insulin resistance.", hi: "फ़ास्टिंग इंसुलिन; अधिक होने पर इंसुलिन रेज़िस्टेंस का संकेत।" },
  },
  // ───────────────────────── Lipids ─────────────────────────
  {
    code: "CHOL", name: "Total Cholesterol", hi: "कुल कोलेस्ट्रॉल", category: "lipids", ...MG,
    aliases: ["total cholesterol", "cholesterol total", "cholesterol", "serum cholesterol", "t cholesterol",
      "cholesterol serum", "total cholesterol serum", "cholestrol total", "total cholestrol", "tc"],
    ranges: [{ high: 199 }], better: "lower", convert: CHOL_CONV, decimals: 0, retest: [180, 365], delta: 15,
    bands: [
      { below: 200, label: { en: "Desirable", hi: "उचित" }, level: "ok" },
      { below: 240, label: { en: "Borderline high", hi: "सीमा पर ऊँचा" }, level: "watch" },
      { label: { en: "High", hi: "ऊँचा" }, level: "alert" },
    ],
    info: { en: "All cholesterol carried in the blood.", hi: "खून में कुल कोलेस्ट्रॉल।" },
  },
  {
    code: "TG", name: "Triglycerides", hi: "ट्राइग्लिसराइड्स", category: "lipids", ...MG,
    aliases: ["triglycerides", "triglyceride", "tg", "serum triglycerides", "trigs", "triglycerides serum", "triglycerides tg"],
    ranges: [{ high: 149 }], critical: { high: 1000 }, better: "lower", convert: { "mmol/l": 88.57 }, decimals: 0,
    retest: [180, 365], delta: 20,
    bands: [
      { below: 150, label: { en: "Normal", hi: "सामान्य" }, level: "ok" },
      { below: 200, label: { en: "Borderline high", hi: "सीमा पर ऊँचा" }, level: "watch" },
      { below: 500, label: { en: "High", hi: "ऊँचा" }, level: "alert" },
      { label: { en: "Very high", hi: "बहुत ऊँचा" }, level: "alert" },
    ],
    info: { en: "Blood fats that rise with sugar, refined carbs and alcohol.", hi: "खून की चर्बी — मीठा, मैदा और शराब से बढ़ती है।" },
  },
  {
    code: "HDL", name: "HDL Cholesterol (good)", hi: "HDL कोलेस्ट्रॉल (अच्छा)", category: "lipids", ...MG,
    aliases: ["hdl cholesterol", "hdl", "hdl c", "high density lipoprotein", "cholesterol hdl", "hdl cholesterol direct",
      "direct hdl", "hdl direct", "hdl cholestrol", "high density lipoprotein cholesterol"],
    ranges: [{ sex: "male", low: 40 }, { sex: "female", low: 50 }, { low: 40 }], better: "higher", convert: CHOL_CONV,
    decimals: 0, retest: [180, 365], delta: 4,
    info: { en: "Protective cholesterol; higher is better.", hi: "सुरक्षात्मक कोलेस्ट्रॉल; ज़्यादा होना बेहतर।" },
  },
  {
    code: "LDL", name: "LDL Cholesterol (bad)", hi: "LDL कोलेस्ट्रॉल (खराब)", category: "lipids", ...MG,
    aliases: ["ldl cholesterol", "ldl", "ldl c", "low density lipoprotein", "cholesterol ldl", "ldl direct", "direct ldl",
      "ldl calculated", "ldl cholesterol direct", "ldl cholesterol calculated", "ldl cholestrol", "low density lipoprotein cholesterol"],
    ranges: [{ high: 99 }], better: "lower", convert: CHOL_CONV, decimals: 0, retest: [180, 365], delta: 10,
    bands: [
      { below: 100, label: { en: "Optimal", hi: "आदर्श" }, level: "ok" },
      { below: 130, label: { en: "Near optimal", hi: "लगभग ठीक" }, level: "watch" },
      { below: 160, label: { en: "Borderline high", hi: "सीमा पर ऊँचा" }, level: "watch" },
      { below: 190, label: { en: "High", hi: "ऊँचा" }, level: "alert" },
      { label: { en: "Very high", hi: "बहुत ऊँचा" }, level: "alert" },
    ],
    info: { en: "Cholesterol that builds up in arteries; main target for heart risk.", hi: "धमनियों में जमने वाला कोलेस्ट्रॉल; हृदय जोखिम का मुख्य लक्ष्य।" },
  },
  {
    code: "VLDL", name: "VLDL Cholesterol", hi: "VLDL कोलेस्ट्रॉल", category: "lipids", ...MG,
    aliases: ["vldl", "vldl cholesterol", "very low density lipoprotein", "vldl c", "cholesterol vldl", "vldl calculated"],
    ranges: [{ low: 5, high: 30 }], better: "lower", convert: CHOL_CONV, decimals: 0, delta: 5,
    info: { en: "Cholesterol carried with triglycerides.", hi: "ट्राइग्लिसराइड के साथ चलने वाला कोलेस्ट्रॉल।" },
  },
  {
    code: "NONHDL", name: "Non-HDL Cholesterol", hi: "नॉन-HDL कोलेस्ट्रॉल", category: "lipids", ...MG,
    aliases: ["non hdl cholesterol", "non hdl", "non hdl c", "nonhdl cholesterol", "non hdl cholestrol"],
    ranges: [{ high: 129 }], better: "lower", convert: CHOL_CONV, decimals: 0, retest: [180, 365], delta: 10,
    info: { en: "Total minus HDL; all the 'bad' cholesterol together.", hi: "कुल में से HDL घटाकर — सारा 'खराब' कोलेस्ट्रॉल।" },
  },
  {
    code: "CHOL_HDL", name: "Total Cholesterol / HDL Ratio", hi: "कोलेस्ट्रॉल / HDL अनुपात", category: "lipids",
    unit: "ratio", unitKey: "ratio",
    aliases: ["total cholesterol hdl ratio", "chol hdl ratio", "tc hdl ratio", "cholesterol hdl ratio", "tc hdl",
      "total cholesterol hdl cholesterol ratio", "chol hdl", "cholesterol hdl", "tc hdl c ratio"],
    ranges: [{ high: 5.0 }], better: "lower", decimals: 1, delta: 0.3,
    info: { en: "Heart-risk ratio; lower is better.", hi: "हृदय जोखिम अनुपात; कम बेहतर।" },
  },
  {
    code: "LDL_HDL", name: "LDL / HDL Ratio", hi: "LDL / HDL अनुपात", category: "lipids", unit: "ratio", unitKey: "ratio",
    aliases: ["ldl hdl ratio", "ldl hdl", "ldl c hdl c ratio", "ldl hdl cholesterol ratio"],
    ranges: [{ high: 3.5 }], better: "lower", decimals: 1, delta: 0.3,
    info: { en: "Ratio of bad to good cholesterol.", hi: "खराब और अच्छे कोलेस्ट्रॉल का अनुपात।" },
  },
  {
    code: "LPA", name: "Lipoprotein(a)", hi: "लिपोप्रोटीन (a)", category: "lipids", ...MG,
    aliases: ["lipoprotein a", "lp a", "lpa", "lipoprotein little a"],
    ranges: [{ high: 30 }], better: "lower", decimals: 0,
    info: { en: "Inherited heart-risk marker, often higher in South Asians.", hi: "आनुवंशिक हृदय जोखिम संकेतक; दक्षिण एशियाई लोगों में अक्सर अधिक।" },
  },
  {
    code: "HOMOCYS", name: "Homocysteine", hi: "होमोसिस्टीन", category: "lipids", unit: "µmol/L", unitKey: "umol/l",
    aliases: ["homocysteine", "serum homocysteine", "homocysteine serum", "plasma homocysteine"],
    ranges: [{ low: 5, high: 15 }], better: "lower", decimals: 1,
    info: { en: "Rises with low B12/folate (common in vegetarians); linked to heart risk.", hi: "B12/फ़ोलेट कम होने पर बढ़ता है; हृदय जोखिम से जुड़ा।" },
  },
  // ───────────────────────── Blood (CBC) ─────────────────────────
  {
    code: "HB", name: "Haemoglobin", hi: "हीमोग्लोबिन", category: "blood", unit: "g/dL", unitKey: "g/dl",
    aliases: ["haemoglobin", "hemoglobin", "hb", "hgb", "haemoglobin hb", "hemoglobin hb", "hb haemoglobin", "hemoglobin hgb",
      "haemoglobin estimation", "hb estimation"],
    ranges: [
      { maxAge: 12, low: 11.5, high: 15.5 },
      { sex: "male", low: 13.0, high: 17.0 },
      { sex: "female", low: 12.0, high: 15.5 },
      { low: 12.0, high: 17.0 },
    ],
    critical: { low: 7, high: 20 }, better: "range", convert: { "g/l": 0.1, "mmol/l": 1.611 }, decimals: 1,
    retest: [90, 365], delta: 0.5,
    info: { en: "Oxygen-carrying protein in red blood cells; low = anaemia.", hi: "लाल रक्त कोशिकाओं का ऑक्सीजन ले जाने वाला प्रोटीन; कम = एनीमिया।" },
  },
  {
    code: "RBC", name: "RBC Count", hi: "लाल रक्त कोशिका (RBC) गिनती", category: "blood", unit: "million/µL", unitKey: "10^6/ul",
    aliases: ["rbc count", "rbc", "red blood cell count", "total rbc count", "red cell count", "erythrocyte count", "total rbc",
      "rbc total count", "red blood cells", "rbc red blood cell count"],
    ranges: [{ sex: "male", low: 4.5, high: 5.9 }, { sex: "female", low: 4.0, high: 5.2 }, { low: 4.0, high: 5.9 }],
    better: "range", qualitativeAlt: "U_RBC", decimals: 2, delta: 0.2,
    info: { en: "Number of red blood cells.", hi: "लाल रक्त कोशिकाओं की संख्या।" },
  },
  {
    code: "HCT", name: "Haematocrit (PCV)", hi: "हीमैटोक्रिट (PCV)", category: "blood", unit: "%", unitKey: "%",
    aliases: ["pcv", "packed cell volume", "hematocrit", "haematocrit", "hct", "pcv hematocrit", "hematocrit pcv",
      "haematocrit pcv", "packed cell volume pcv"],
    ranges: [{ sex: "male", low: 40, high: 50 }, { sex: "female", low: 36, high: 46 }, { low: 36, high: 50 }],
    better: "range", decimals: 1, delta: 2,
    info: { en: "Share of blood made up of red cells.", hi: "खून में लाल कोशिकाओं का प्रतिशत।" },
  },
  {
    code: "MCV", name: "MCV", hi: "MCV (लाल कोशिका का आकार)", category: "blood", unit: "fL", unitKey: "fl",
    aliases: ["mcv", "mean corpuscular volume", "mean cell volume", "mcv mean corpuscular volume"],
    ranges: [{ low: 80, high: 100 }], better: "range", decimals: 1, delta: 3,
    info: { en: "Average red cell size: small suggests iron deficiency, large suggests B12/folate deficiency.", hi: "लाल कोशिका का औसत आकार: छोटा = आयरन की कमी, बड़ा = B12/फ़ोलेट की कमी।" },
  },
  {
    code: "MCH", name: "MCH", hi: "MCH", category: "blood", unit: "pg", unitKey: "pg",
    aliases: ["mch", "mean corpuscular haemoglobin", "mean corpuscular hemoglobin", "mean cell haemoglobin", "mean cell hemoglobin"],
    ranges: [{ low: 27, high: 32 }], better: "range", decimals: 1, delta: 1.5,
    info: { en: "Average haemoglobin per red cell.", hi: "प्रति लाल कोशिका औसत हीमोग्लोबिन।" },
  },
  {
    code: "MCHC", name: "MCHC", hi: "MCHC", category: "blood", unit: "g/dL", unitKey: "g/dl",
    aliases: ["mchc", "mean corpuscular haemoglobin concentration", "mean corpuscular hemoglobin concentration",
      "mean cell haemoglobin concentration", "mean cell hemoglobin concentration"],
    ranges: [{ low: 32, high: 36 }], better: "range", convert: { "g/l": 0.1 }, decimals: 1, delta: 1,
    info: { en: "Haemoglobin concentration inside red cells.", hi: "लाल कोशिकाओं में हीमोग्लोबिन की सांद्रता।" },
  },
  {
    code: "RDW", name: "RDW-CV", hi: "RDW-CV", category: "blood", unit: "%", unitKey: "%",
    aliases: ["rdw", "rdw cv", "red cell distribution width", "rdw cv red cell distribution width", "red cell distribution width cv"],
    ranges: [{ low: 11.5, high: 14.5 }], better: "range", decimals: 1, delta: 1,
    info: { en: "Variation in red cell size.", hi: "लाल कोशिकाओं के आकार में अंतर।" },
  },
  {
    code: "WBC", name: "Total WBC Count (TLC)", hi: "कुल श्वेत रक्त कोशिका (TLC)", category: "blood",
    unit: "×10³/µL", unitKey: "10^3/ul",
    aliases: ["total leucocyte count", "total leukocyte count", "tlc", "wbc", "wbc count", "white blood cell count",
      "total wbc count", "leucocyte count", "leukocyte count", "total count", "white cell count", "total white blood cell count",
      "wbc total count", "total leucocytes count", "tlc total leucocyte count", "total wbc", "white blood cells",
      "total leukocytes count", "leucocytes", "leukocytes"],
    ranges: [{ low: 4.0, high: 11.0 }], critical: { low: 2.0, high: 30 }, better: "range",
    convert: { "/ul": 0.001, "lakh/ul": 100 }, qualitativeAlt: "U_PUS", decimals: 2, delta: 1,
    info: { en: "White blood cells fight infection.", hi: "श्वेत रक्त कोशिकाएँ संक्रमण से लड़ती हैं।" },
  },
  {
    code: "NEUT", name: "Neutrophils", hi: "न्यूट्रोफ़िल", category: "blood", unit: "%", unitKey: "%",
    aliases: ["neutrophils", "neutrophil", "polymorphs", "segmented neutrophils", "neutrophil percentage", "polymorphonuclear",
      "pmn", "neutrophils segmented", "polymorphs neutrophils", "neutrophil count"],
    ranges: [{ low: 40, high: 75 }], better: "range", countAlt: "ANC", decimals: 0, delta: 5,
    info: { en: "Main bacteria-fighting white cells (% of WBC).", hi: "बैक्टीरिया से लड़ने वाली मुख्य श्वेत कोशिकाएँ (% में)।" },
  },
  {
    code: "LYMPH", name: "Lymphocytes", hi: "लिम्फ़ोसाइट", category: "blood", unit: "%", unitKey: "%",
    aliases: ["lymphocytes", "lymphocyte", "lymphocyte percentage", "lymphocytes count"],
    ranges: [{ low: 20, high: 45 }], better: "range", countAlt: "ALC", decimals: 0, delta: 5,
    info: { en: "Immune cells, often raised in viral infections (% of WBC).", hi: "प्रतिरक्षा कोशिकाएँ, वायरल संक्रमण में अक्सर बढ़ती हैं (% में)।" },
  },
  {
    code: "MONO", name: "Monocytes", hi: "मोनोसाइट", category: "blood", unit: "%", unitKey: "%",
    aliases: ["monocytes", "monocyte", "monocytes count"], ranges: [{ low: 2, high: 10 }], better: "range", decimals: 0, delta: 2,
    info: { en: "White cells that clear infection and debris.", hi: "संक्रमण साफ़ करने वाली श्वेत कोशिकाएँ।" },
  },
  {
    code: "EOS", name: "Eosinophils", hi: "इयोसिनोफ़िल", category: "blood", unit: "%", unitKey: "%",
    aliases: ["eosinophils", "eosinophil", "eosinophils count"], ranges: [{ low: 1, high: 6 }], better: "range",
    countAlt: "AEC", decimals: 0, delta: 2,
    info: { en: "Raised in allergies, asthma and worm infections.", hi: "एलर्जी, अस्थमा और पेट के कीड़ों में बढ़ते हैं।" },
  },
  {
    code: "BASO", name: "Basophils", hi: "बेसोफ़िल", category: "blood", unit: "%", unitKey: "%",
    aliases: ["basophils", "basophil"], ranges: [{ low: 0, high: 2 }], better: "range", decimals: 0, delta: 1,
    info: { en: "Rare white cells involved in allergy.", hi: "एलर्जी से जुड़ी दुर्लभ श्वेत कोशिकाएँ।" },
  },
  {
    code: "ANC", name: "Absolute Neutrophil Count", hi: "एब्सोल्यूट न्यूट्रोफ़िल काउंट", category: "blood",
    unit: "×10³/µL", unitKey: "10^3/ul",
    aliases: ["absolute neutrophil count", "anc", "neutrophils absolute", "absolute neutrophils", "absolute neutrophil", "neutrophils abs"],
    ranges: [{ low: 2.0, high: 7.0 }], critical: { low: 0.5 }, better: "range", convert: { "/ul": 0.001 }, decimals: 2, delta: 0.5,
    info: { en: "Number of neutrophils per microlitre.", hi: "प्रति माइक्रोलीटर न्यूट्रोफ़िल।" },
  },
  {
    code: "ALC", name: "Absolute Lymphocyte Count", hi: "एब्सोल्यूट लिम्फ़ोसाइट काउंट", category: "blood",
    unit: "×10³/µL", unitKey: "10^3/ul",
    aliases: ["absolute lymphocyte count", "alc", "lymphocytes absolute", "absolute lymphocytes", "lymphocytes abs"],
    ranges: [{ low: 1.0, high: 3.0 }], better: "range", convert: { "/ul": 0.001 }, decimals: 2, delta: 0.3,
    info: { en: "Number of lymphocytes per microlitre.", hi: "प्रति माइक्रोलीटर लिम्फ़ोसाइट।" },
  },
  {
    code: "AEC", name: "Absolute Eosinophil Count", hi: "एब्सोल्यूट इयोसिनोफ़िल काउंट", category: "blood",
    unit: "/µL", unitKey: "/ul",
    aliases: ["absolute eosinophil count", "aec", "eosinophils absolute", "absolute eosinophils", "eosinophils abs"],
    ranges: [{ low: 40, high: 440 }], better: "range", convert: { "10^3/ul": 1000 }, decimals: 0, delta: 50,
    info: { en: "Eosinophils per microlitre; high in allergy/worm infestation.", hi: "प्रति माइक्रोलीटर इयोसिनोफ़िल; एलर्जी/कृमि में अधिक।" },
  },
  {
    code: "PLT", name: "Platelet Count", hi: "प्लेटलेट काउंट", category: "blood", unit: "×10³/µL", unitKey: "10^3/ul",
    aliases: ["platelet count", "platelets", "plt", "platelet", "total platelet count", "thrombocyte count", "plt count",
      "platelets count", "platelet count plt"],
    ranges: [{ low: 150, high: 450 }], critical: { low: 50, high: 1000 }, better: "range",
    convert: { "lakh/ul": 100, "/ul": 0.001 }, decimals: 0, delta: 30,
    info: { en: "Cells that help blood clot; falls in dengue.", hi: "खून जमाने वाली कोशिकाएँ; डेंगू में घटती हैं।" },
  },
  {
    code: "MPV", name: "Mean Platelet Volume", hi: "मीन प्लेटलेट वॉल्यूम", category: "blood", unit: "fL", unitKey: "fl",
    aliases: ["mpv", "mean platelet volume"], ranges: [{ low: 7.5, high: 11.5 }], better: "range", decimals: 1, delta: 1,
    info: { en: "Average platelet size.", hi: "प्लेटलेट का औसत आकार।" },
  },
  {
    code: "ESR", name: "ESR", hi: "ESR", category: "inflammation", unit: "mm/hr", unitKey: "mm/hr",
    aliases: ["esr", "erythrocyte sedimentation rate", "esr westergren", "sedimentation rate", "esr erythrocyte sedimentation rate",
      "esr wintrobe", "esr 1st hour"],
    ranges: [{ sex: "male", low: 0, high: 15 }, { sex: "female", low: 0, high: 20 }, { low: 0, high: 20 }],
    better: "lower", decimals: 0, delta: 5,
    info: { en: "Non-specific marker of inflammation.", hi: "सूजन का सामान्य संकेतक।" },
  },
  // ───────────────────────── Iron ─────────────────────────
  {
    code: "FERRITIN", name: "Ferritin", hi: "फ़ेरिटिन", category: "iron", unit: "ng/mL", unitKey: "ng/ml",
    aliases: ["ferritin", "serum ferritin", "ferritin serum"],
    ranges: [{ sex: "male", low: 30, high: 400 }, { sex: "female", low: 15, high: 150 }, { low: 15, high: 400 }],
    better: "range", convert: { "pmol/l": 1 / 2.247 }, decimals: 0, retest: [90, 365], delta: 10,
    info: { en: "Body's iron stores; the earliest sign of iron deficiency.", hi: "शरीर में जमा आयरन; आयरन की कमी का सबसे शुरुआती संकेत।" },
  },
  {
    code: "IRON", name: "Serum Iron", hi: "सीरम आयरन", category: "iron", unit: "µg/dL", unitKey: "ug/dl",
    aliases: ["iron", "serum iron", "iron serum", "s iron"],
    ranges: [{ sex: "male", low: 65, high: 175 }, { sex: "female", low: 50, high: 170 }, { low: 50, high: 175 }],
    better: "range", convert: { "umol/l": 5.585 }, decimals: 0, delta: 15,
    info: { en: "Iron circulating in the blood.", hi: "खून में घूम रहा आयरन।" },
  },
  {
    code: "TIBC", name: "TIBC", hi: "TIBC", category: "iron", unit: "µg/dL", unitKey: "ug/dl",
    aliases: ["tibc", "total iron binding capacity", "iron binding capacity total"],
    ranges: [{ low: 250, high: 450 }], better: "range", convert: { "umol/l": 5.585 }, decimals: 0, delta: 20,
    info: { en: "Capacity to carry iron; high in iron deficiency.", hi: "आयरन ले जाने की क्षमता; आयरन की कमी में बढ़ती है।" },
  },
  {
    code: "TSAT", name: "Transferrin Saturation", hi: "ट्रांसफ़रिन सैचुरेशन", category: "iron", unit: "%", unitKey: "%",
    aliases: ["transferrin saturation", "tsat", "saturation", "iron saturation", "transferrin saturation percentage",
      "percent saturation", "transferrin saturation tsat"],
    ranges: [{ low: 20, high: 50 }], better: "range", decimals: 0, delta: 5,
    info: { en: "How much of the iron carrier is filled.", hi: "आयरन वाहक कितना भरा है।" },
  },
  // ───────────────────────── Vitamins ─────────────────────────
  {
    code: "VITD", name: "Vitamin D (25-OH)", hi: "विटामिन D (25-OH)", category: "vitamins", unit: "ng/mL", unitKey: "ng/ml",
    aliases: ["vitamin d", "25 oh vitamin d", "25 hydroxy vitamin d", "vitamin d 25 hydroxy", "vitamin d total", "25 oh vit d",
      "vit d", "vitamin d3", "25 hydroxyvitamin d", "vitamin d 25 oh", "total vitamin d", "25 oh d", "vitamin d total 25 hydroxy",
      "25 hydroxy vitamin d total", "vitamin d 25 hydroxy total", "25 hydroxy cholecalciferol", "vit d3", "25 oh vitamin d total",
      "vitamin d 25 oh total", "25 hydroxy vit d"],
    ranges: [{ low: 30, high: 100 }], critical: { high: 150 }, better: "range", convert: { "nmol/l": 1 / 2.496 }, decimals: 1,
    retest: [90, 365], delta: 5,
    bands: [
      { below: 20, label: { en: "Deficient", hi: "कमी" }, level: "alert" },
      { below: 30, label: { en: "Insufficient", hi: "अपर्याप्त" }, level: "watch" },
      { below: 100, label: { en: "Sufficient", hi: "पर्याप्त" }, level: "ok" },
      { label: { en: "Excess", hi: "अधिक" }, level: "watch" },
    ],
    info: { en: "Vitamin for bones and immunity; deficiency is very common in India.", hi: "हड्डियों और इम्युनिटी का विटामिन; भारत में इसकी कमी बहुत आम है।" },
  },
  {
    code: "VITB12", name: "Vitamin B12", hi: "विटामिन B12", category: "vitamins", unit: "pg/mL", unitKey: "pg/ml",
    aliases: ["vitamin b12", "vit b12", "b12", "cyanocobalamin", "cobalamin", "serum b12", "vitamin b 12", "serum vitamin b12",
      "vitamin b12 cyanocobalamin", "vitamin b12 level"],
    ranges: [{ low: 200, high: 900 }], better: "range", convert: { "pmol/l": 1.355 }, decimals: 0, retest: [90, 365], delta: 40,
    bands: [
      { below: 200, label: { en: "Deficient", hi: "कमी" }, level: "alert" },
      { below: 300, label: { en: "Borderline", hi: "सीमा पर" }, level: "watch" },
      { below: 1000, label: { en: "Normal", hi: "सामान्य" }, level: "ok" },
      { label: { en: "High", hi: "अधिक" }, level: "watch" },
    ],
    info: { en: "Needed for nerves and blood; often low in vegetarians.", hi: "नसों और खून के लिए ज़रूरी; शाकाहारियों में अक्सर कम।" },
  },
  {
    code: "FOLATE", name: "Folate (Folic acid)", hi: "फ़ोलेट (फ़ोलिक एसिड)", category: "vitamins", unit: "ng/mL", unitKey: "ng/ml",
    aliases: ["folate", "folic acid", "serum folate", "vitamin b9", "folic acid serum"],
    ranges: [{ low: 4, high: 20 }], better: "range", convert: { "nmol/l": 1 / 2.266 }, decimals: 1, delta: 1,
    info: { en: "B vitamin needed for blood formation and pregnancy.", hi: "खून बनाने और गर्भावस्था के लिए ज़रूरी B विटामिन।" },
  },
  // ───────────────────────── Thyroid ─────────────────────────
  {
    code: "TSH", name: "TSH", hi: "TSH (थायरॉइड)", category: "thyroid", unit: "µIU/mL", unitKey: "uiu/ml",
    aliases: ["tsh", "thyroid stimulating hormone", "tsh ultrasensitive", "ultrasensitive tsh", "tsh 3rd generation",
      "thyrotropin", "us tsh", "tsh ultra sensitive", "serum tsh", "tsh third generation", "thyroid stimulating hormone tsh",
      "tsh 4th generation", "ultra sensitive tsh", "tsh us", "hs tsh"],
    ranges: [{ low: 0.4, high: 4.5 }], better: "range", convert: { "miu/ml": 1 }, decimals: 2, retest: [180, 365], delta: 0.5,
    bands: [
      { below: 0.1, label: { en: "Suppressed", hi: "बहुत कम" }, level: "alert" },
      { below: 0.4, label: { en: "Low", hi: "कम" }, level: "watch" },
      { below: 4.51, label: { en: "Normal", hi: "सामान्य" }, level: "ok" },
      { below: 10, label: { en: "Mildly raised", hi: "थोड़ा बढ़ा" }, level: "watch" },
      { label: { en: "High", hi: "ऊँचा" }, level: "alert" },
    ],
    info: { en: "Pituitary signal to the thyroid; high usually means an underactive thyroid.", hi: "थायरॉइड को संकेत देने वाला हार्मोन; अधिक = अक्सर कम सक्रिय थायरॉइड।" },
  },
  {
    code: "T3", name: "Total T3", hi: "टोटल T3", category: "thyroid", unit: "ng/dL", unitKey: "ng/dl",
    aliases: ["t3", "total t3", "t3 total", "triiodothyronine", "triiodothyronine total", "total triiodothyronine", "t3 triiodothyronine"],
    ranges: [{ low: 80, high: 200 }], better: "range", convert: { "nmol/l": 65.1, "ng/ml": 100 }, decimals: 0, delta: 15,
    info: { en: "Active thyroid hormone (total).", hi: "सक्रिय थायरॉइड हार्मोन (कुल)।" },
  },
  {
    code: "T4", name: "Total T4", hi: "टोटल T4", category: "thyroid", unit: "µg/dL", unitKey: "ug/dl",
    aliases: ["t4", "total t4", "t4 total", "thyroxine", "thyroxine total", "total thyroxine", "t4 thyroxine"],
    ranges: [{ low: 5.0, high: 12.0 }], better: "range", convert: { "nmol/l": 1 / 12.87 }, decimals: 1, delta: 1,
    info: { en: "Main thyroid hormone (total).", hi: "मुख्य थायरॉइड हार्मोन (कुल)।" },
  },
  {
    code: "FT3", name: "Free T3", hi: "फ़्री T3", category: "thyroid", unit: "pg/mL", unitKey: "pg/ml",
    aliases: ["free t3", "ft3", "free triiodothyronine", "t3 free", "ft3 free triiodothyronine"],
    ranges: [{ low: 2.0, high: 4.4 }], better: "range", convert: { "pmol/l": 1 / 1.536 }, decimals: 2, delta: 0.3,
    info: { en: "Unbound, active T3.", hi: "मुक्त, सक्रिय T3।" },
  },
  {
    code: "FT4", name: "Free T4", hi: "फ़्री T4", category: "thyroid", unit: "ng/dL", unitKey: "ng/dl",
    aliases: ["free t4", "ft4", "free thyroxine", "t4 free", "ft4 free thyroxine"],
    ranges: [{ low: 0.93, high: 1.7 }], better: "range", convert: { "pmol/l": 1 / 12.87 }, decimals: 2, delta: 0.15,
    info: { en: "Unbound thyroxine.", hi: "मुक्त थायरॉक्सिन।" },
  },
  {
    code: "ANTI_TPO", name: "Anti-TPO Antibodies", hi: "एंटी-TPO एंटीबॉडी", category: "thyroid", unit: "IU/mL", unitKey: "iu/ml",
    aliases: ["anti tpo", "anti thyroid peroxidase", "tpo antibodies", "anti tpo antibodies", "thyroid peroxidase antibody",
      "anti thyroid peroxidase antibodies", "anti tpo ab", "tpo ab"],
    ranges: [{ high: 34 }], better: "lower", decimals: 0,
    info: { en: "Autoimmune thyroid marker (Hashimoto's).", hi: "ऑटोइम्यून थायरॉइड संकेतक (हाशिमोटो)।" },
  },
  // ───────────────────────── Kidney ─────────────────────────
  {
    code: "CREAT", name: "Creatinine", hi: "क्रिएटिनिन", category: "kidney", ...MG,
    aliases: ["creatinine", "serum creatinine", "creatinine serum", "creat", "s creatinine", "creatinine s", "plasma creatinine"],
    ranges: [{ sex: "male", low: 0.7, high: 1.3 }, { sex: "female", low: 0.6, high: 1.1 }, { low: 0.6, high: 1.3 }],
    critical: { high: 5 }, better: "range", convert: { "umol/l": 1 / 88.42 }, decimals: 2, retest: [90, 365], delta: 0.15,
    info: { en: "Waste filtered by kidneys; rises when kidney function falls.", hi: "किडनी द्वारा छाना जाने वाला अपशिष्ट; किडनी कमज़ोर होने पर बढ़ता है।" },
  },
  {
    code: "UREA", name: "Blood Urea", hi: "ब्लड यूरिया", category: "kidney", ...MG,
    aliases: ["urea", "blood urea", "serum urea", "urea serum", "s urea", "blood urea serum", "urea blood"],
    ranges: [{ low: 15, high: 45 }], critical: { high: 200 }, better: "range", convert: { "mmol/l": 6.006 }, decimals: 0, delta: 6,
    info: { en: "Protein waste cleared by kidneys.", hi: "किडनी द्वारा साफ़ होने वाला प्रोटीन अपशिष्ट।" },
  },
  {
    code: "BUN", name: "Blood Urea Nitrogen (BUN)", hi: "ब्लड यूरिया नाइट्रोजन (BUN)", category: "kidney", ...MG,
    aliases: ["bun", "blood urea nitrogen", "urea nitrogen", "serum urea nitrogen", "bun blood urea nitrogen", "urea nitrogen bun"],
    ranges: [{ low: 7, high: 20 }], better: "range", convert: { "mmol/l": 2.801 }, decimals: 0, delta: 3,
    info: { en: "Nitrogen part of urea.", hi: "यूरिया का नाइट्रोजन भाग।" },
  },
  {
    code: "URIC", name: "Uric Acid", hi: "यूरिक एसिड", category: "kidney", ...MG,
    aliases: ["uric acid", "serum uric acid", "s uric acid", "urate", "uric acid serum"],
    ranges: [{ sex: "male", low: 3.5, high: 7.2 }, { sex: "female", low: 2.6, high: 6.0 }, { low: 2.6, high: 7.2 }],
    better: "range", convert: { "umol/l": 1 / 59.48 }, decimals: 1, retest: [180, 365], delta: 0.5,
    info: { en: "High levels can cause gout and kidney stones.", hi: "अधिक होने पर गठिया (गाउट) और पथरी।" },
  },
  {
    code: "EGFR", name: "eGFR", hi: "eGFR (किडनी फ़िल्टर दर)", category: "kidney", unit: "mL/min/1.73m²", unitKey: "ml/min/1.73m2",
    aliases: ["egfr", "estimated gfr", "estimated glomerular filtration rate", "gfr", "egfr ckd epi", "egfr mdrd",
      "glomerular filtration rate"],
    ranges: [{ low: 90 }], critical: { low: 15 }, better: "higher", decimals: 0, retest: [90, 365], delta: 5,
    bands: [
      { below: 15, label: { en: "Kidney failure range", hi: "किडनी फ़ेल्योर रेंज" }, level: "alert" },
      { below: 30, label: { en: "Severely reduced", hi: "बहुत कम" }, level: "alert" },
      { below: 60, label: { en: "Moderately reduced", hi: "मध्यम कम" }, level: "alert" },
      { below: 90, label: { en: "Mildly reduced", hi: "थोड़ा कम" }, level: "watch" },
      { label: { en: "Normal", hi: "सामान्य" }, level: "ok" },
    ],
    info: { en: "Estimated kidney filtering capacity; higher is better.", hi: "किडनी की अनुमानित छानने की क्षमता; अधिक बेहतर।" },
  },
  {
    code: "UACR", name: "Urine Albumin/Creatinine Ratio", hi: "यूरिन एल्ब्यूमिन/क्रिएटिनिन अनुपात", category: "kidney",
    unit: "mg/g", unitKey: "mg/g",
    aliases: ["urine albumin creatinine ratio", "uacr", "microalbumin creatinine ratio", "acr", "albumin creatinine ratio",
      "urine microalbumin creatinine ratio", "urinary albumin creatinine ratio"],
    ranges: [{ high: 29 }], better: "lower", convert: { "mg/mmol": 8.84 }, decimals: 0, retest: [180, 365],
    info: { en: "Early marker of kidney damage in diabetes/BP.", hi: "डायबिटीज़/BP में किडनी नुकसान का शुरुआती संकेत।" },
  },
  // ───────────────────────── Liver ─────────────────────────
  {
    code: "ALT", name: "SGPT (ALT)", hi: "SGPT (ALT)", category: "liver", unit: "U/L", unitKey: "u/l",
    aliases: ["sgpt", "alt", "alanine aminotransferase", "alanine transaminase", "sgpt alt", "alt sgpt",
      "alanine aminotransferase alt", "alanine amino transferase", "s g p t"],
    ranges: [{ sex: "male", high: 45 }, { sex: "female", high: 35 }, { high: 40 }], critical: { high: 1000 },
    better: "lower", decimals: 0, retest: [90, 365], delta: 8,
    info: { en: "Liver enzyme; raised in fatty liver, hepatitis, alcohol or some medicines.", hi: "लिवर एंज़ाइम; फ़ैटी लिवर, हेपेटाइटिस, शराब या कुछ दवाओं से बढ़ता है।" },
  },
  {
    code: "AST", name: "SGOT (AST)", hi: "SGOT (AST)", category: "liver", unit: "U/L", unitKey: "u/l",
    aliases: ["sgot", "ast", "aspartate aminotransferase", "aspartate transaminase", "sgot ast", "ast sgot",
      "aspartate aminotransferase ast", "aspartate amino transferase", "s g o t"],
    ranges: [{ sex: "male", high: 40 }, { sex: "female", high: 35 }, { high: 40 }], critical: { high: 1000 },
    better: "lower", decimals: 0, retest: [90, 365], delta: 8,
    info: { en: "Enzyme found in liver and muscle.", hi: "लिवर और मांसपेशियों का एंज़ाइम।" },
  },
  {
    code: "ALP", name: "Alkaline Phosphatase", hi: "एल्कलाइन फ़ॉस्फ़ेटेज़", category: "liver", unit: "U/L", unitKey: "u/l",
    aliases: ["alkaline phosphatase", "alp", "serum alkaline phosphatase", "alk phosphatase", "alkaline phosphatase alp", "sap"],
    ranges: [{ maxAge: 17, low: 50, high: 420 }, { low: 44, high: 147 }], better: "range", decimals: 0, delta: 15,
    info: { en: "Enzyme from liver and bone.", hi: "लिवर और हड्डी का एंज़ाइम।" },
  },
  {
    code: "GGT", name: "GGT", hi: "GGT", category: "liver", unit: "U/L", unitKey: "u/l",
    aliases: ["ggt", "gamma gt", "gamma glutamyl transferase", "ggtp", "gamma glutamyl transpeptidase", "gamma gt ggt",
      "g g t", "gamma glutamyltransferase"],
    ranges: [{ sex: "male", high: 55 }, { sex: "female", high: 38 }, { high: 55 }], better: "lower", decimals: 0, delta: 8,
    info: { en: "Liver enzyme sensitive to alcohol and bile flow.", hi: "शराब और पित्त से प्रभावित लिवर एंज़ाइम।" },
  },
  {
    code: "BILI_T", name: "Total Bilirubin", hi: "कुल बिलीरुबिन", category: "liver", ...MG,
    aliases: ["bilirubin total", "total bilirubin", "serum bilirubin total", "s bilirubin total", "bilirubin t", "t bilirubin",
      "bilirubin", "serum bilirubin", "total bilirubin serum"],
    ranges: [{ low: 0.2, high: 1.2 }], critical: { high: 15 }, better: "lower", convert: { "umol/l": 1 / 17.1 }, decimals: 2,
    delta: 0.2,
    info: { en: "Pigment cleared by the liver; high causes jaundice.", hi: "लिवर द्वारा साफ़ होने वाला रंजक; अधिक = पीलिया।" },
  },
  {
    code: "BILI_D", name: "Direct Bilirubin", hi: "डायरेक्ट बिलीरुबिन", category: "liver", ...MG,
    aliases: ["bilirubin direct", "direct bilirubin", "conjugated bilirubin", "bilirubin conjugated", "bilirubin d", "d bilirubin"],
    ranges: [{ low: 0, high: 0.3 }], better: "lower", convert: { "umol/l": 1 / 17.1 }, decimals: 2, delta: 0.1,
    info: { en: "Bilirubin processed by the liver.", hi: "लिवर द्वारा प्रोसेस किया गया बिलीरुबिन।" },
  },
  {
    code: "BILI_I", name: "Indirect Bilirubin", hi: "इनडायरेक्ट बिलीरुबिन", category: "liver", ...MG,
    aliases: ["bilirubin indirect", "indirect bilirubin", "unconjugated bilirubin", "bilirubin unconjugated", "i bilirubin"],
    ranges: [{ low: 0.1, high: 1.0 }], better: "lower", convert: { "umol/l": 1 / 17.1 }, decimals: 2, delta: 0.15,
    info: { en: "Bilirubin not yet processed by the liver.", hi: "जो बिलीरुबिन अभी लिवर ने प्रोसेस नहीं किया।" },
  },
  {
    code: "PROT_T", name: "Total Protein", hi: "कुल प्रोटीन", category: "liver", unit: "g/dL", unitKey: "g/dl",
    aliases: ["total protein", "protein total", "serum total protein", "total proteins", "serum protein total", "proteins total",
      "total serum protein"],
    ranges: [{ low: 6.0, high: 8.3 }], better: "range", convert: { "g/l": 0.1 }, decimals: 1, delta: 0.3,
    info: { en: "Albumin plus globulins.", hi: "एल्ब्यूमिन और ग्लोब्युलिन का योग।" },
  },
  {
    code: "ALB", name: "Albumin", hi: "एल्ब्यूमिन", category: "liver", unit: "g/dL", unitKey: "g/dl",
    aliases: ["albumin", "serum albumin", "albumin serum", "s albumin"],
    ranges: [{ low: 3.5, high: 5.2 }], better: "range", convert: { "g/l": 0.1 }, qualitativeAlt: "U_PROTEIN", decimals: 1,
    delta: 0.3,
    info: { en: "Main blood protein made by the liver.", hi: "लिवर द्वारा बनने वाला मुख्य प्रोटीन।" },
  },
  {
    code: "GLOB", name: "Globulin", hi: "ग्लोब्युलिन", category: "liver", unit: "g/dL", unitKey: "g/dl",
    aliases: ["globulin", "serum globulin", "globulins"],
    ranges: [{ low: 2.0, high: 3.5 }], better: "range", convert: { "g/l": 0.1 }, decimals: 1, delta: 0.3,
    info: { en: "Proteins including antibodies.", hi: "एंटीबॉडी सहित प्रोटीन।" },
  },
  {
    code: "AG_RATIO", name: "A/G Ratio", hi: "A/G अनुपात", category: "liver", unit: "ratio", unitKey: "ratio",
    aliases: ["a g ratio", "albumin globulin ratio", "ag ratio", "a g ratio albumin globulin", "albumin globulin a g ratio"],
    ranges: [{ low: 1.0, high: 2.1 }], better: "range", decimals: 2, delta: 0.2,
    info: { en: "Albumin to globulin ratio.", hi: "एल्ब्यूमिन और ग्लोब्युलिन का अनुपात।" },
  },
  // ───────────────────────── Electrolytes ─────────────────────────
  {
    code: "NA", name: "Sodium", hi: "सोडियम", category: "electrolytes", unit: "mmol/L", unitKey: "mmol/l",
    aliases: ["sodium", "serum sodium", "na", "s sodium", "sodium serum", "sodium na"],
    ranges: [{ low: 135, high: 145 }], critical: { low: 125, high: 155 }, better: "range", decimals: 0, delta: 3,
    info: { en: "Key salt for fluid balance and nerves.", hi: "शरीर के पानी संतुलन और नसों के लिए ज़रूरी लवण।" },
  },
  {
    code: "K", name: "Potassium", hi: "पोटैशियम", category: "electrolytes", unit: "mmol/L", unitKey: "mmol/l",
    aliases: ["potassium", "serum potassium", "k", "s potassium", "potassium serum", "potassium k"],
    ranges: [{ low: 3.5, high: 5.1 }], critical: { low: 3.0, high: 6.0 }, better: "range", decimals: 1, delta: 0.3,
    info: { en: "Mineral vital for heart rhythm.", hi: "दिल की धड़कन के लिए ज़रूरी खनिज।" },
  },
  {
    code: "CL", name: "Chloride", hi: "क्लोराइड", category: "electrolytes", unit: "mmol/L", unitKey: "mmol/l",
    aliases: ["chloride", "serum chloride", "cl", "chloride serum", "chloride cl"],
    ranges: [{ low: 98, high: 107 }], better: "range", decimals: 0, delta: 3,
    info: { en: "Salt that works with sodium.", hi: "सोडियम के साथ काम करने वाला लवण।" },
  },
  {
    code: "CA", name: "Calcium", hi: "कैल्शियम", category: "electrolytes", ...MG,
    aliases: ["calcium", "serum calcium", "total calcium", "calcium total", "s calcium", "ca", "calcium serum"],
    ranges: [{ low: 8.6, high: 10.3 }], critical: { low: 6.5, high: 13 }, better: "range", convert: { "mmol/l": 4.008 },
    decimals: 1, delta: 0.3,
    info: { en: "Mineral for bones, muscles and nerves.", hi: "हड्डियों, मांसपेशियों और नसों का खनिज।" },
  },
  {
    code: "PHOS", name: "Phosphorus", hi: "फ़ॉस्फ़ोरस", category: "electrolytes", ...MG,
    aliases: ["phosphorus", "inorganic phosphorus", "serum phosphorus", "phosphate", "serum phosphate", "phosphorus inorganic"],
    ranges: [{ low: 2.5, high: 4.5 }], better: "range", convert: { "mmol/l": 3.097 }, decimals: 1, delta: 0.3,
    info: { en: "Mineral that works with calcium.", hi: "कैल्शियम के साथ काम करने वाला खनिज।" },
  },
  {
    code: "MG", name: "Magnesium", hi: "मैग्नीशियम", category: "electrolytes", ...MG,
    aliases: ["magnesium", "serum magnesium", "magnesium serum", "mg serum"],
    ranges: [{ low: 1.7, high: 2.4 }], better: "range", convert: { "mmol/l": 2.431 }, decimals: 1, delta: 0.2,
    info: { en: "Mineral for muscles and heart rhythm.", hi: "मांसपेशियों और धड़कन का खनिज।" },
  },
  // ───────────────────────── Inflammation & others ─────────────────────────
  {
    code: "CRP", name: "C-Reactive Protein (CRP)", hi: "सी-रिएक्टिव प्रोटीन (CRP)", category: "inflammation", unit: "mg/L",
    unitKey: "mg/l",
    aliases: ["crp", "c reactive protein", "crp quantitative", "serum crp", "c reactive protein crp", "crp c reactive protein",
      "quantitative crp"],
    ranges: [{ high: 6 }], better: "lower", convert: { "mg/dl": 10 }, decimals: 1, delta: 3,
    info: { en: "Rises quickly with infection or inflammation.", hi: "संक्रमण या सूजन में जल्दी बढ़ता है।" },
  },
  {
    code: "HSCRP", name: "hs-CRP", hi: "hs-CRP (हृदय जोखिम)", category: "inflammation", unit: "mg/L", unitKey: "mg/l",
    aliases: ["hs crp", "hscrp", "high sensitivity crp", "high sensitivity c reactive protein", "hs c reactive protein",
      "highly sensitive crp", "c reactive protein high sensitivity"],
    ranges: [{ high: 3 }], better: "lower", convert: { "mg/dl": 10 }, decimals: 2, delta: 0.5,
    bands: [
      { below: 1, label: { en: "Low heart risk", hi: "कम हृदय जोखिम" }, level: "ok" },
      { below: 3, label: { en: "Average heart risk", hi: "औसत हृदय जोखिम" }, level: "watch" },
      { label: { en: "High heart risk", hi: "उच्च हृदय जोखिम" }, level: "alert" },
    ],
    info: { en: "Low-grade inflammation linked to heart risk.", hi: "हल्की सूजन, हृदय जोखिम से जुड़ी।" },
  },
  {
    code: "PSA", name: "PSA (Total)", hi: "PSA (कुल)", category: "hormones", unit: "ng/mL", unitKey: "ng/ml",
    aliases: ["psa", "total psa", "prostate specific antigen", "psa total", "prostate specific antigen total"],
    ranges: [{ high: 4 }], better: "lower", decimals: 2,
    info: { en: "Prostate marker for men; interpret with a doctor.", hi: "पुरुषों में प्रोस्टेट संकेतक; डॉक्टर से समझें।" },
  },
  // ───────────────────────── Urine (qualitative) ─────────────────────────
  {
    code: "U_PROTEIN", name: "Urine Protein / Albumin", hi: "पेशाब में प्रोटीन / एल्ब्यूमिन", category: "urine", unit: "", unitKey: "",
    aliases: ["urine protein", "urine albumin", "protein urine", "albumin urine", "proteins", "urine proteins",
      "albumin protein", "protein albumin", "urinary protein"],
    ranges: [], better: "none", qualitativeNormal: ["nil", "negative", "absent", "not detected", "neg"], decimals: 0,
    numericAlt: "PROT_T",
    info: { en: "Protein in urine can signal kidney stress.", hi: "पेशाब में प्रोटीन किडनी पर दबाव का संकेत हो सकता है।" },
  },
  {
    code: "U_GLUCOSE", name: "Urine Sugar", hi: "पेशाब में शुगर", category: "urine", unit: "", unitKey: "",
    aliases: ["urine glucose", "urine sugar", "sugar urine", "glucose urine", "urinary glucose", "urine glucose qualitative"],
    ranges: [], better: "none", qualitativeNormal: ["nil", "negative", "absent", "not detected", "neg"], decimals: 0,
    info: { en: "Sugar spills into urine when blood sugar is high.", hi: "ब्लड शुगर ज़्यादा होने पर शुगर पेशाब में आती है।" },
  },
  {
    code: "U_KETONE", name: "Urine Ketones", hi: "पेशाब में कीटोन", category: "urine", unit: "", unitKey: "",
    aliases: ["ketone bodies", "ketones", "urine ketones", "acetone", "ketone", "urine ketone"],
    ranges: [], better: "none", qualitativeNormal: ["nil", "negative", "absent", "not detected", "neg"], decimals: 0,
    info: { en: "Appear with fasting or uncontrolled diabetes.", hi: "उपवास या अनियंत्रित डायबिटीज़ में आते हैं।" },
  },
  {
    code: "U_PUS", name: "Urine Pus Cells", hi: "पेशाब में पस सेल्स", category: "urine", unit: "/hpf", unitKey: "/hpf",
    aliases: ["pus cells", "pus cell", "urine pus cells", "leucocytes urine", "wbc urine", "pus cells urine", "urine wbc"],
    ranges: [{ low: 0, high: 5 }], better: "lower", qualitativeNormal: ["nil", "absent", "occasional", "negative"], decimals: 0,
    info: { en: "White cells in urine; high suggests urinary infection.", hi: "पेशाब में श्वेत कोशिकाएँ; अधिक = यूरिन इन्फ़ेक्शन की संभावना।" },
  },
  {
    code: "U_RBC", name: "Urine RBCs", hi: "पेशाब में RBC", category: "urine", unit: "/hpf", unitKey: "/hpf",
    aliases: ["urine rbc", "red blood cells urine", "rbc urine", "urine red blood cells", "rbcs"],
    ranges: [{ low: 0, high: 2 }], better: "lower", qualitativeNormal: ["nil", "absent", "not seen", "negative"], decimals: 0,
    info: { en: "Blood in urine; needs evaluation if persistent.", hi: "पेशाब में खून; लगातार हो तो जाँच ज़रूरी।" },
  },
  {
    code: "U_SG", name: "Urine Specific Gravity", hi: "पेशाब का स्पेसिफ़िक ग्रैविटी", category: "urine", unit: "", unitKey: "",
    aliases: ["specific gravity", "sp gravity", "urine specific gravity", "sp gr"],
    ranges: [{ low: 1.005, high: 1.03 }], better: "range", decimals: 3,
    info: { en: "Urine concentration; reflects hydration.", hi: "पेशाब की सघनता; पानी पीने को दर्शाती है।" },
  },
  {
    code: "U_PH", name: "Urine pH", hi: "पेशाब का pH", category: "urine", unit: "", unitKey: "",
    aliases: ["ph", "urine ph", "reaction ph", "ph urine"],
    ranges: [{ low: 4.5, high: 8 }], better: "range", decimals: 1,
    info: { en: "Acidity of urine.", hi: "पेशाब की अम्लता।" },
  },
  // ───────────────────────── Vitals ─────────────────────────
  {
    code: "BP_SYS", name: "Blood Pressure – Systolic", hi: "ब्लड प्रेशर – ऊपर वाला (सिस्टोलिक)", category: "vitals",
    unit: "mmHg", unitKey: "mmhg", aliases: ["systolic", "systolic bp", "sbp", "systolic blood pressure"],
    ranges: [{ low: 90, high: 129 }], critical: { low: 80, high: 180 }, better: "range", decimals: 0, retest: [30, 180], delta: 8,
    bands: [
      { below: 90, label: { en: "Low", hi: "कम" }, level: "watch" },
      { below: 130, label: { en: "Normal", hi: "सामान्य" }, level: "ok" },
      { below: 140, label: { en: "High-normal", hi: "सामान्य से थोड़ा अधिक" }, level: "watch" },
      { below: 160, label: { en: "Hypertension grade 1", hi: "हाई BP ग्रेड 1" }, level: "alert" },
      { label: { en: "Hypertension grade 2+", hi: "हाई BP ग्रेड 2+" }, level: "alert" },
    ],
    info: { en: "Pressure when the heart beats.", hi: "दिल धड़कते समय का दबाव।" },
  },
  {
    code: "BP_DIA", name: "Blood Pressure – Diastolic", hi: "ब्लड प्रेशर – नीचे वाला (डायस्टोलिक)", category: "vitals",
    unit: "mmHg", unitKey: "mmhg", aliases: ["diastolic", "diastolic bp", "dbp", "diastolic blood pressure"],
    ranges: [{ low: 60, high: 84 }], critical: { high: 120 }, better: "range", decimals: 0, retest: [30, 180], delta: 5,
    bands: [
      { below: 60, label: { en: "Low", hi: "कम" }, level: "watch" },
      { below: 85, label: { en: "Normal", hi: "सामान्य" }, level: "ok" },
      { below: 90, label: { en: "High-normal", hi: "सामान्य से थोड़ा अधिक" }, level: "watch" },
      { below: 100, label: { en: "Hypertension grade 1", hi: "हाई BP ग्रेड 1" }, level: "alert" },
      { label: { en: "Hypertension grade 2+", hi: "हाई BP ग्रेड 2+" }, level: "alert" },
    ],
    info: { en: "Pressure between heartbeats.", hi: "दो धड़कनों के बीच का दबाव।" },
  },
  {
    code: "PULSE", name: "Pulse", hi: "नाड़ी (पल्स)", category: "vitals", unit: "bpm", unitKey: "bpm",
    aliases: ["pulse", "pulse rate", "heart rate", "hr"], ranges: [{ low: 60, high: 100 }], critical: { low: 40, high: 140 },
    better: "range", decimals: 0, delta: 8,
    info: { en: "Heartbeats per minute at rest.", hi: "आराम में प्रति मिनट धड़कन।" },
  },
  {
    code: "SPO2", name: "Oxygen Saturation (SpO₂)", hi: "ऑक्सीजन स्तर (SpO₂)", category: "vitals", unit: "%", unitKey: "%",
    aliases: ["spo2", "oxygen saturation", "sp o2", "o2 saturation"], ranges: [{ low: 95, high: 100 }], critical: { low: 90 },
    better: "higher", decimals: 0, delta: 2,
    info: { en: "Blood oxygen from a pulse oximeter.", hi: "पल्स ऑक्सीमीटर से खून में ऑक्सीजन।" },
  },
  {
    code: "TEMP", name: "Body Temperature", hi: "शरीर का तापमान", category: "vitals", unit: "°F", unitKey: "f",
    aliases: ["temperature", "body temperature", "temp"], ranges: [{ low: 97, high: 99 }], critical: { high: 103 },
    better: "range", convert: { c: (v) => (v * 9) / 5 + 32 }, decimals: 1, delta: 1,
    info: { en: "Oral temperature in °F.", hi: "°F में मुँह का तापमान।" },
  },
  {
    code: "WEIGHT", name: "Weight", hi: "वज़न", category: "vitals", unit: "kg", unitKey: "kg", aliases: ["weight", "body weight", "wt"],
    ranges: [], better: "none", decimals: 1, delta: 1,
    info: { en: "Body weight.", hi: "शरीर का वज़न।" },
  },
  {
    code: "BMI", name: "BMI", hi: "BMI", category: "vitals", unit: "kg/m²", unitKey: "kg/m2", aliases: ["bmi", "body mass index"],
    ranges: [{ low: 18.5, high: 22.9 }], better: "range", decimals: 1, delta: 0.5,
    bands: [
      { below: 18.5, label: { en: "Underweight", hi: "कम वज़न" }, level: "watch" },
      { below: 23, label: { en: "Normal (Asian-Indian cut-off)", hi: "सामान्य (एशियाई-भारतीय मानक)" }, level: "ok" },
      { below: 25, label: { en: "Overweight", hi: "अधिक वज़न" }, level: "watch" },
      { label: { en: "Obese", hi: "मोटापा" }, level: "alert" },
    ],
    info: { en: "Weight for height, using Asian-Indian cut-offs (normal below 23).", hi: "लंबाई के अनुसार वज़न, एशियाई-भारतीय मानक (23 से कम सामान्य)।" },
  },
  {
    code: "WAIST", name: "Waist Circumference", hi: "कमर का घेरा", category: "vitals", unit: "cm", unitKey: "cm",
    aliases: ["waist", "waist circumference"], ranges: [{ sex: "male", high: 89 }, { sex: "female", high: 79 }, { high: 89 }],
    better: "lower", decimals: 0, delta: 2,
    info: { en: "Belly fat measure; Indian cut-offs are 90 cm (men) and 80 cm (women).", hi: "पेट की चर्बी का माप; भारतीय मानक पुरुष 90 सेमी, महिला 80 सेमी।" },
  },
];

export const BIOMARKERS: ReadonlyMap<string, Biomarker> = new Map(list.map((b) => [b.code, b]));
export const BIOMARKER_LIST: readonly Biomarker[] = list;

export function getBiomarker(code: string | null | undefined): Biomarker | undefined {
  return code ? BIOMARKERS.get(code) : undefined;
}

/** Biomarkers shown as headline tiles on the dashboard, in order. */
export const KEY_MARKERS = ["HBA1C", "GLU_F", "LDL", "TG", "HB", "VITD", "VITB12", "TSH", "CREAT", "EGFR", "ALT", "BP_SYS"];

/** Markers people log at home (glucometer, BP machine, oximeter, scale). */
export const VITAL_CODES = ["BP_SYS", "BP_DIA", "PULSE", "GLU_F", "GLU_PP", "GLU_R", "WEIGHT", "WAIST", "SPO2", "TEMP"];
