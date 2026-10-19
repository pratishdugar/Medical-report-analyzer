import { ADVICE, adviceFor, URGENT_ACTION } from "./advice";
import { getBiomarker, type Biomarker, type L, type Sex } from "./biomarkers";
import { bmi, egfrCkdEpi2021 } from "./derived";
import { ageOn, bandFor, computeFlag, defaultRange, isAbnormal, isCritical, type Flag } from "./normalize";

export type ObsLite = {
  id: string;
  code: string | null;
  name: string;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  flag: string;
  observedAt: string;
};

export type ProfileLite = {
  dateOfBirth: string | null;
  sex: string | null;
  heightCm: number | null;
  diet: string | null;
};

export type Severity = "critical" | "high" | "moderate" | "info" | "positive";
export type Insight = {
  id: string;
  kind: "alert" | "trend" | "derived" | "pattern" | "reminder" | "screening";
  severity: Severity;
  code?: string;
  title: L;
  body: L;
  tips?: L[];
  action?: L;
};

export function formatNumber(n: number, decimals = 1): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

export function formatDate(iso: string, locale: "en" | "hi" = "en"): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

function valueLabel(o: { valueNum: number | null; valueText: string | null; unit: string | null }, b?: Biomarker) {
  if (o.valueNum === null) return o.valueText ?? "";
  return `${formatNumber(o.valueNum, b?.decimals ?? 2)}${o.unit ? ` ${o.unit}` : ""}`;
}

function displayName(o: { code: string | null; name: string }): L {
  const b = getBiomarker(o.code);
  return b ? { en: b.name, hi: b.hi } : { en: o.name, hi: o.name };
}

/** Group numeric observations by biomarker code, oldest first. */
export function seriesByCode(obs: ObsLite[]): Map<string, ObsLite[]> {
  const map = new Map<string, ObsLite[]>();
  for (const o of obs) {
    if (!o.code) continue;
    const arr = map.get(o.code) ?? [];
    arr.push(o);
    map.set(o.code, arr);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  return map;
}

export function latestByCode(obs: ObsLite[]): Map<string, ObsLite> {
  const out = new Map<string, ObsLite>();
  for (const [code, arr] of seriesByCode(obs)) out.set(code, arr[arr.length - 1]);
  return out;
}

export type Derived = { code: string; value: number; observedAt: string; flag: Flag };

/** Values we can compute when the lab didn't print them (eGFR, BMI, non-HDL). */
export function derivedValues(obs: ObsLite[], profile: ProfileLite): Derived[] {
  const latest = latestByCode(obs);
  const sex = (profile.sex === "male" || profile.sex === "female" ? profile.sex : null) as Sex | null;
  const out: Derived[] = [];
  const add = (code: string, value: number | null, observedAt: string) => {
    const b = getBiomarker(code);
    if (value === null || !b) return;
    const r = defaultRange(b, sex, ageOn(profile.dateOfBirth, observedAt));
    out.push({ code, value, observedAt, flag: computeFlag(value, r?.low, r?.high, b.critical) });
  };
  const creat = latest.get("CREAT");
  const egfr = latest.get("EGFR");
  if (creat?.valueNum && sex && (!egfr || egfr.observedAt < creat.observedAt)) {
    const age = ageOn(profile.dateOfBirth, creat.observedAt);
    if (age !== null) add("EGFR", egfrCkdEpi2021(creat.valueNum, age, sex), creat.observedAt);
  }
  const weight = latest.get("WEIGHT");
  const bmiObs = latest.get("BMI");
  if (weight?.valueNum && profile.heightCm && (!bmiObs || bmiObs.observedAt < weight.observedAt)) {
    add("BMI", bmi(weight.valueNum, profile.heightCm), weight.observedAt);
  }
  const tc = latest.get("CHOL");
  const hdl = latest.get("HDL");
  if (tc?.valueNum && hdl?.valueNum && tc.observedAt === hdl.observedAt && !latest.get("NONHDL")) {
    add("NONHDL", Math.round(tc.valueNum - hdl.valueNum), tc.observedAt);
  }
  return out;
}

function alertFor(o: { code: string | null; name: string; valueNum: number | null; valueText: string | null; unit: string | null; flag: string; observedAt: string }, derived = false): Insight {
  const b = getBiomarker(o.code);
  const name = displayName(o);
  const advice = adviceFor(o.code, o.flag);
  const band = b && o.valueNum !== null ? bandFor(b, o.valueNum) : null;
  const critical = isCritical(o.flag);
  const dir: L = o.flag.includes("high")
    ? { en: "above the reference range", hi: "सामान्य सीमा से अधिक" }
    : o.flag.includes("low")
      ? { en: "below the reference range", hi: "सामान्य सीमा से कम" }
      : { en: "abnormal", hi: "असामान्य" };
  const status = band ? band.label : dir;
  const v = valueLabel(o, b);
  const severity: Severity = critical ? "critical" : band?.level === "alert" ? "high" : band?.level === "watch" ? "moderate" : "high";
  const specific = o.code ? ADVICE[o.code] : undefined;
  const title: L = specific
    ? advice.title
    : o.flag.includes("high")
      ? { en: `${name.en} is high`, hi: `${name.hi} अधिक है` }
      : o.flag.includes("low")
        ? { en: `${name.en} is low`, hi: `${name.hi} कम है` }
        : { en: `${name.en} is abnormal`, hi: `${name.hi} असामान्य है` };
  return {
    id: `alert:${o.code ?? o.name}`,
    kind: "alert",
    severity,
    code: o.code ?? undefined,
    title,
    body: {
      en: `${derived ? "Calculated " : ""}${name.en}: ${v} on ${formatDate(o.observedAt)} — ${status.en}.`,
      hi: `${derived ? "गणना किया गया " : ""}${name.hi}: ${v} (${formatDate(o.observedAt, "hi")}) — ${status.hi}।`,
    },
    tips: advice.tips,
    action: critical ? URGENT_ACTION : advice.action,
  };
}

function trendInsight(code: string, arr: ObsLite[]): Insight | null {
  const b = getBiomarker(code);
  const nums = arr.filter((o) => o.valueNum !== null);
  if (!b || nums.length < 2 || b.better === "none") return null;
  const last = nums[nums.length - 1];
  const prev = nums[nums.length - 2];
  const delta = last.valueNum! - prev.valueNum!;
  if (Math.abs(delta) < (b.delta ?? 0) || delta === 0) return null;
  const dist = (o: ObsLite) => {
    const lo = o.refLow ?? -Infinity;
    const hi = o.refHigh ?? Infinity;
    return o.valueNum! < lo ? lo - o.valueNum! : o.valueNum! > hi ? o.valueNum! - hi : 0;
  };
  let improved: boolean;
  if (b.better === "lower") improved = delta < 0;
  else if (b.better === "higher") improved = delta > 0;
  else {
    const d0 = dist(prev);
    const d1 = dist(last);
    if (d0 === d1) return null;
    improved = d1 < d0;
  }
  if (!improved && !isAbnormal(last.flag)) return null;
  const from = formatNumber(prev.valueNum!, b.decimals);
  const to = formatNumber(last.valueNum!, b.decimals);
  const pct = prev.valueNum ? Math.round((Math.abs(delta) / Math.abs(prev.valueNum)) * 100) : null;
  const pctTxt = pct !== null && Number.isFinite(pct) ? ` (${pct}%)` : "";
  return {
    id: `trend:${code}`,
    kind: "trend",
    severity: improved ? "positive" : "moderate",
    code,
    title: improved
      ? { en: `${b.name} is improving`, hi: `${b.hi} में सुधार` }
      : { en: `${b.name} is moving the wrong way`, hi: `${b.hi} बिगड़ रहा है` },
    body: {
      en: `${improved ? "Improved" : "Changed"} from ${from} to ${to} ${b.unit}${pctTxt} between ${formatDate(prev.observedAt)} and ${formatDate(last.observedAt)}.`,
      hi: `${formatDate(prev.observedAt, "hi")} से ${formatDate(last.observedAt, "hi")} के बीच ${from} से ${to} ${b.unit}${pctTxt}।`,
    },
  };
}

function patterns(latest: Map<string, ObsLite>, derived: Derived[], profile: ProfileLite): Insight[] {
  const out: Insight[] = [];
  const val = (code: string) => latest.get(code)?.valueNum ?? derived.find((d) => d.code === code)?.value ?? null;
  const female = profile.sex === "female";
  const criteria: L[] = [];
  const tg = val("TG");
  if (tg !== null && tg >= 150) criteria.push({ en: "high triglycerides", hi: "अधिक ट्राइग्लिसराइड" });
  const hdl = val("HDL");
  if (hdl !== null && hdl < (female ? 50 : 40)) criteria.push({ en: "low HDL", hi: "कम HDL" });
  const fbs = val("GLU_F");
  if (fbs !== null && fbs >= 100) criteria.push({ en: "raised fasting sugar", hi: "बढ़ी फ़ास्टिंग शुगर" });
  const sys = val("BP_SYS");
  const dia = val("BP_DIA");
  if ((sys !== null && sys >= 130) || (dia !== null && dia >= 85)) criteria.push({ en: "raised blood pressure", hi: "बढ़ा BP" });
  const waist = val("WAIST");
  if (waist !== null && waist >= (female ? 80 : 90)) criteria.push({ en: "high waist size", hi: "अधिक कमर" });
  if (criteria.length >= 3) {
    out.push({
      id: "pattern:metabolic",
      kind: "pattern",
      severity: "high",
      title: { en: "Pattern consistent with metabolic syndrome", hi: "मेटाबॉलिक सिंड्रोम जैसा पैटर्न" },
      body: {
        en: `Your latest results show ${criteria.map((c) => c.en).join(", ")}. Three or more of these together raise the risk of diabetes and heart disease.`,
        hi: `आपकी हाल की रिपोर्ट में ${criteria.map((c) => c.hi).join(", ")} दिखते हैं। इनमें से तीन या अधिक साथ हों तो डायबिटीज़ और हृदय रोग का जोखिम बढ़ता है।`,
      },
      tips: adviceFor("TG", "high").tips.slice(0, 2),
      action: { en: "Ask your doctor for a full cardiometabolic risk assessment.", hi: "डॉक्टर से पूरा कार्डियो-मेटाबॉलिक जोखिम आकलन कराएँ।" },
    });
  }
  const hb = latest.get("HB");
  const mcv = latest.get("MCV");
  if (hb && mcv && hb.flag.includes("low") && mcv.observedAt === hb.observedAt && mcv.valueNum !== null) {
    if (mcv.valueNum < 80) {
      out.push({
        id: "pattern:microcytic",
        kind: "pattern",
        severity: "moderate",
        title: { en: "Low haemoglobin with small red cells", hi: "कम हीमोग्लोबिन और छोटी लाल कोशिकाएँ" },
        body: {
          en: "This combination is most often seen with iron deficiency; thalassaemia trait is another common cause in India.",
          hi: "यह संयोजन अक्सर आयरन की कमी में दिखता है; भारत में थैलेसीमिया ट्रेट भी एक आम कारण है।",
        },
        action: { en: "Ask your doctor whether ferritin or HbA2 (HPLC) testing is needed.", hi: "डॉक्टर से पूछें कि क्या फ़ेरिटिन या HbA2 (HPLC) जाँच ज़रूरी है।" },
      });
    } else if (mcv.valueNum > 100) {
      out.push({
        id: "pattern:macrocytic",
        kind: "pattern",
        severity: "moderate",
        title: { en: "Low haemoglobin with large red cells", hi: "कम हीमोग्लोबिन और बड़ी लाल कोशिकाएँ" },
        body: {
          en: "This combination is often seen with vitamin B12 or folate deficiency, which is common with vegetarian diets.",
          hi: "यह संयोजन अक्सर विटामिन B12 या फ़ोलेट की कमी में दिखता है, जो शाकाहारी आहार में आम है।",
        },
        action: { en: "Ask your doctor about B12 and folate tests.", hi: "डॉक्टर से B12 और फ़ोलेट जाँच के बारे में पूछें।" },
      });
    }
  }
  return out;
}

const REMINDER_CODES = ["HBA1C", "GLU_F", "LDL", "CHOL", "TG", "VITD", "VITB12", "TSH", "HB", "CREAT", "ALT", "FERRITIN", "URIC"];

function reminders(latest: Map<string, ObsLite>, today: string): Insight[] {
  const out: Insight[] = [];
  for (const code of REMINDER_CODES) {
    const o = latest.get(code);
    const b = getBiomarker(code);
    if (!o || !b?.retest) continue;
    const interval = isAbnormal(o.flag) ? b.retest[0] : b.retest[1];
    const age = daysBetween(o.observedAt, today);
    if (age >= interval) {
      out.push({
        id: `reminder:${code}`,
        kind: "reminder",
        severity: "info",
        code,
        title: { en: `Time to recheck ${b.name}`, hi: `${b.hi} दोबारा जाँचने का समय` },
        body: {
          en: `Last tested on ${formatDate(o.observedAt)} (${Math.round(age / 30)} months ago)${isAbnormal(o.flag) ? " and it was out of range" : ""}.`,
          hi: `पिछली जाँच ${formatDate(o.observedAt, "hi")} को हुई थी (${Math.round(age / 30)} महीने पहले)${isAbnormal(o.flag) ? " और वह सामान्य सीमा से बाहर थी" : ""}।`,
        },
      });
    }
  }
  return out;
}

function screening(obs: ObsLite[], profile: ProfileLite, today: string): Insight[] {
  const age = ageOn(profile.dateOfBirth, today);
  const testedWithin = (codes: string[], days: number) =>
    obs.some((o) => o.code && codes.includes(o.code) && daysBetween(o.observedAt, today) <= days);
  const out: Insight[] = [];
  const add = (id: string, title: L, body: L) => out.push({ id: `screening:${id}`, kind: "screening", severity: "info", title, body });
  if (age !== null && age >= 30 && !testedWithin(["HBA1C", "GLU_F", "GLU_PP", "GLU_R"], 365)) {
    add("sugar", { en: "Yearly diabetes screening", hi: "सालाना डायबिटीज़ जाँच" }, {
      en: "Adults 30+ should check fasting sugar or HbA1c every year (India's national NCD screening programme covers this).",
      hi: "30+ उम्र के वयस्कों को हर साल फ़ास्टिंग शुगर या HbA1c जाँचनी चाहिए (राष्ट्रीय NCD स्क्रीनिंग कार्यक्रम में शामिल)।",
    });
  }
  if (age !== null && age >= 30 && !testedWithin(["BP_SYS"], 365)) {
    add("bp", { en: "Check your blood pressure", hi: "अपना ब्लड प्रेशर जाँचें" }, {
      en: "High BP is often silent. Log a reading here after measuring at home or at a pharmacy.",
      hi: "हाई BP अक्सर बिना लक्षण होता है। घर या फ़ार्मेसी पर नापकर यहाँ रीडिंग दर्ज करें।",
    });
  }
  if (age !== null && age >= 25 && !testedWithin(["CHOL", "LDL"], 365 * (age >= 40 ? 1 : 3))) {
    add("lipids", { en: "Lipid profile due", hi: "लिपिड प्रोफ़ाइल जाँच बाकी" }, {
      en: "Heart disease starts earlier in Indians; a lipid profile is recommended periodically from your 20s–30s.",
      hi: "भारतीयों में हृदय रोग जल्दी शुरू होता है; 20–30 की उम्र से समय-समय पर लिपिड प्रोफ़ाइल कराएँ।",
    });
  }
  if (["vegetarian", "vegan", "jain", "eggetarian"].includes(profile.diet ?? "") && !testedWithin(["VITB12"], 365 * 2)) {
    add("b12", { en: "Consider a vitamin B12 test", hi: "विटामिन B12 जाँच पर विचार करें" }, {
      en: "B12 deficiency is common with vegetarian diets and can cause fatigue, tingling and anaemia.",
      hi: "शाकाहारी आहार में B12 की कमी आम है; इससे थकान, झुनझुनी और एनीमिया हो सकता है।",
    });
  }
  if (age !== null && age >= 18 && !testedWithin(["VITD"], 365 * 3)) {
    add("vitd", { en: "Vitamin D is worth checking", hi: "विटामिन D जाँचना उपयोगी है" }, {
      en: "Most Indians studied have low vitamin D despite the sunshine; ask your doctor if a test makes sense for you.",
      hi: "धूप के बावजूद अधिकांश भारतीयों में विटामिन D कम पाया गया है; डॉक्टर से पूछें कि क्या आपको जाँच करानी चाहिए।",
    });
  }
  if (profile.sex === "female" && age !== null && age >= 15 && age <= 49 && !testedWithin(["HB"], 365)) {
    add("anaemia", { en: "Yearly haemoglobin check", hi: "सालाना हीमोग्लोबिन जाँच" }, {
      en: "Anaemia affects more than half of Indian women of reproductive age; a simple Hb test catches it early.",
      hi: "प्रजनन आयु की आधी से अधिक भारतीय महिलाओं में एनीमिया है; साधारण Hb जाँच से जल्दी पता चलता है।",
    });
  }
  return out;
}

const ORDER: Record<Severity, number> = { critical: 0, high: 1, moderate: 2, positive: 3, info: 4 };
const KIND_ORDER: Record<Insight["kind"], number> = { alert: 0, pattern: 1, derived: 2, trend: 3, reminder: 4, screening: 5 };

/** Build all insights for one profile. Pure function — safe to unit test. */
export function computeInsights(obs: ObsLite[], profile: ProfileLite, today = new Date().toISOString().slice(0, 10)): Insight[] {
  const latest = latestByCode(obs);
  const derived = derivedValues(obs, profile);
  const insights: Insight[] = [];

  for (const o of latest.values()) {
    if (isAbnormal(o.flag)) insights.push(alertFor(o));
  }
  for (const o of obs) {
    if (!o.code && isAbnormal(o.flag) && obs.filter((x) => x.name === o.name).at(-1) === o) insights.push(alertFor(o));
  }
  for (const d of derived) {
    const b = getBiomarker(d.code)!;
    const synthetic = { code: d.code, name: b.name, valueNum: d.value, valueText: null, unit: b.unit, flag: d.flag, observedAt: d.observedAt };
    if (isAbnormal(d.flag)) insights.push({ ...alertFor(synthetic, true), kind: "derived" });
    else {
      insights.push({
        id: `derived:${d.code}`,
        kind: "derived",
        severity: "positive",
        code: d.code,
        title: { en: `${b.name} is in the healthy range`, hi: `${b.hi} स्वस्थ सीमा में है` },
        body: {
          en: `Calculated from your results: ${formatNumber(d.value, b.decimals)} ${b.unit} (${formatDate(d.observedAt)}).`,
          hi: `आपके परिणामों से गणना: ${formatNumber(d.value, b.decimals)} ${b.unit} (${formatDate(d.observedAt, "hi")})।`,
        },
      });
    }
  }
  insights.push(...patterns(latest, derived, profile));
  for (const [code, arr] of seriesByCode(obs)) {
    const t = trendInsight(code, arr);
    if (t) insights.push(t);
  }
  insights.push(...reminders(latest, today));
  insights.push(...screening(obs, profile, today));

  return insights.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/** Series for computed markers (eGFR from creatinine, BMI from weight) when the lab didn't report them. */
export function derivedSeries(code: string, obs: ObsLite[], profile: ProfileLite): ObsLite[] {
  const sex = profile.sex === "male" || profile.sex === "female" ? profile.sex : null;
  const b = getBiomarker(code);
  if (!b) return [];
  const make = (o: ObsLite, value: number | null): ObsLite[] => {
    if (value === null) return [];
    const r = defaultRange(b, sex, ageOn(profile.dateOfBirth, o.observedAt));
    return [{ id: `calc-${o.id}`, code, name: b.name, valueNum: value, valueText: null, unit: b.unit, refLow: r?.low ?? null, refHigh: r?.high ?? null, flag: computeFlag(value, r?.low, r?.high, b.critical), observedAt: o.observedAt }];
  };
  if (code === "EGFR" && sex) {
    return obs.filter((o) => o.code === "CREAT" && o.valueNum !== null).flatMap((o) => {
      const age = ageOn(profile.dateOfBirth, o.observedAt);
      return age === null ? [] : make(o, egfrCkdEpi2021(o.valueNum!, age, sex));
    });
  }
  if (code === "BMI" && profile.heightCm) {
    return obs.filter((o) => o.code === "WEIGHT" && o.valueNum !== null).flatMap((o) => make(o, bmi(o.valueNum!, profile.heightCm!)));
  }
  return [];
}
