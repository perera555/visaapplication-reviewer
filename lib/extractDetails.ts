// Pulls applicant details out of uploaded document text (passport MRZ, bank statements,
// employment letters, offer letters, IELTS/PTE reports, IDs). Works for documents from any country.

export type Detail = { key: string; label: string; value: string; source: string };

export const DETAIL_LABELS: Record<string, string> = {
  surname: "Surname", givenNames: "Given names", fullName: "Full name", passportNo: "Passport number",
  nationality: "Nationality", dob: "Date of birth", sex: "Sex", passportIssue: "Passport issue date",
  passportExpiry: "Passport expiry date", placeOfBirth: "Place of birth", nationalId: "National ID number",
  email: "Email", phone: "Phone", address: "Address", employer: "Employer", occupation: "Job title",
  income: "Monthly salary", bankBalance: "Bank balance", accountHolder: "Account holder",
  englishTest: "English test", englishScore: "English score", institution: "University / college",
  course: "Course", courseStart: "Course start date", duration: "Course duration", institutionAddress: "University address", campus: "Campus", cricos: "Course code (CRICOS)", scholarship: "Scholarship", maritalStatus: "Marital status",
};

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

/** Normalise many date formats to yyyy-mm-dd (best effort). */
export function toIsoDate(s: string): string {
  const t = s.trim();
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]*([A-Za-z]{3})[a-z]*\.?[\s-,]*(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  m = t.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${MONTHS[m[1].toLowerCase()]}-${m[2].padStart(2, "0")}`;
  return t;
}

function mrzDate(yymmdd: string, future: boolean) {
  const yy = Number(yymmdd.slice(0, 2));
  const now = new Date().getFullYear() % 100;
  const century = future ? 2000 : yy > now ? 1900 : 2000;
  return `${century + yy}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
}

// ISO-3166 alpha-3 → alpha-2 for passport MRZ nationality codes
const ISO3: Record<string, string> = {
  LKA: "LK", IND: "IN", PAK: "PK", BGD: "BD", NPL: "NP", GBR: "GB", USA: "US", CAN: "CA", AUS: "AU", NZL: "NZ",
  CHN: "CN", PHL: "PH", NGA: "NG", GHA: "GH", KEN: "KE", ZAF: "ZA", EGY: "EG", ARE: "AE", SAU: "SA", MYS: "MY",
  SGP: "SG", IDN: "ID", VNM: "VN", THA: "TH", JPN: "JP", KOR: "KR", DEU: "DE", FRA: "FR", ITA: "IT", ESP: "ES",
  NLD: "NL", IRL: "IE", BRA: "BR", MEX: "MX", TUR: "TR", RUS: "RU", UKR: "UA", MDV: "MV", AFG: "AF", IRN: "IR",
  IRQ: "IQ", JOR: "JO", LBN: "LB", ETH: "ET", UGA: "UG", TZA: "TZ", ZWE: "ZW", ZMB: "ZM", CMR: "CM", MMR: "MM",
};
export const iso3to2 = (c: string) => ISO3[c.toUpperCase()] ?? "";

const grab = (t: string, re: RegExp, group = 1) => t.match(re)?.[group]?.trim().replace(/\s{2,}/g, " ");

export function extractDetails(text: string, source: string): Detail[] {
  const out = new Map<string, string>();
  const put = (k: string, v?: string) => {
    if (v && v.length > 0 && v.length < 120 && !out.has(k)) out.set(k, v);
  };
  const t = text.replace(/\r/g, "");

  // ---- passport MRZ (line 1: P<CCCSURNAME<<GIVEN<NAMES, line 2: number, nationality, DOB, sex, expiry) ----
  const lines = t.split("\n").map((l) => l.replace(/\s+/g, "").toUpperCase());
  for (let i = 0; i < lines.length - 1; i++) {
    const l1 = lines[i].match(/^P[A-Z<]([A-Z<]{3})([A-Z<]{5,})$/);
    const l2 = lines[i + 1].match(/^([A-Z0-9<]{6,9}?)[0-9<]([A-Z<]{3})(\d{6})[0-9<]([MFX<])(\d{6})/);
    if (!l1 || !l2) continue;
    const [sur, ...given] = l1[2].replace(/<+$/, "").split("<<");
    put("surname", sur.replace(/</g, " ").trim());
    put("givenNames", given.join(" ").replace(/</g, " ").trim());
    put("passportNo", l2[1].replace(/</g, ""));
    put("nationality", l2[2].replace(/</g, ""));
    put("dob", mrzDate(l2[3], false));
    put("sex", l2[4] === "M" ? "Male" : l2[4] === "F" ? "Female" : "");
    put("passportExpiry", mrzDate(l2[5], true));
    break;
  }

  // ---- labelled fields ----
  const DATE = "([0-9]{1,4}[-/. ][0-9A-Za-z]{1,9}[-/. ,]*[0-9]{2,4})";
  put("surname", grab(t, /\b(?:surname|family name|last name)\s*[:\-]?\s*([A-Z][A-Za-z' -]{1,40})/i));
  put("givenNames", grab(t, /\b(?:given names?|first names?|forenames?)\s*[:\-]?\s*([A-Z][A-Za-z' -]{1,40})/i));
  put("fullName", grab(t, /\b(?:full name|name of (?:the )?(?:applicant|employee|student|candidate|account holder)|candidate name|student name)\s*[:\-]?\s*([A-Z][A-Za-z.' -]{3,60})/i));
  put("fullName", grab(t, /\b(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/));
  put("passportNo", grab(t, /\bpassport\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z]{0,2}[0-9]{6,9}[A-Z]?)\b/i));
  put("nationality", grab(t, /\bnationality\s*[:\-]?\s*([A-Za-z ]{3,30})/i));
  put("dob", grab(t, new RegExp(`\\b(?:date of birth|d\\.o\\.b\\.?|dob|birth date)\\s*[:\\-]?\\s*${DATE}`, "i")));
  put("passportIssue", grab(t, new RegExp(`\\b(?:date of issue|issue date|issued on)\\s*[:\\-]?\\s*${DATE}`, "i")));
  put("passportExpiry", grab(t, new RegExp(`\\b(?:date of expiry|expiry date|expiration date|valid until|date of expiration)\\s*[:\\-]?\\s*${DATE}`, "i")));
  put("placeOfBirth", grab(t, /\bplace of birth\s*[:\-]?\s*([A-Za-z ,]{2,40})/i));
  put("nationalId", grab(t, /\b(?:national id(?:entity)?(?: card)?(?: no\.?| number)?|nic(?: no\.?)?)\s*[:\-]?\s*([0-9]{9,12}[VvXx]?)\b/i));
  put("sex", grab(t, /\b(?:sex|gender)\s*[:\-]?\s*(male|female|m|f)\b/i)?.replace(/^m$/i, "Male").replace(/^f$/i, "Female"));
  put("maritalStatus", grab(t, /\bmarital status\s*[:\-]?\s*(single|married|divorced|widowed|separated)/i));
  put("email", grab(t, /([\w.+-]+@[\w-]+\.[\w.-]+)/));
  put("phone", grab(t, /\b(?:tel|phone|mobile|contact)\s*(?:no\.?|number)?\s*[:\-]?\s*(\+?[0-9][0-9 ()-]{7,16}[0-9])/i));
  put("address", grab(t, /\baddress\s*[:\-]?\s*([^\n]{8,100})/i));

  // ---- employment ----
  put("occupation", grab(t, /\b(?:designation|position|job title|post)\s*[:\-]?\s*([A-Za-z &/-]{3,50})/i) ?? grab(t, /\bemployed (?:with us )?as (?:an? )?([A-Za-z &/-]{3,50}?)(?: since| from| with|[.,])/i));
  put("employer", grab(t, /\b(?:employer|company name|organisation|organization)\s*[:\-]?\s*([A-Z][A-Za-z0-9 &.,()-]{2,60})/i) ?? grab(t, /\b([A-Z][A-Za-z0-9&.() ]{2,50}(?:Ltd|Limited|PLC|Inc|LLC|Corporation|Company|Bank|Hospital|University))\b/));
  put("income", grab(t, /\b(?:basic salary|gross salary|net salary|monthly salary|salary)\s*(?:of|is|:)?\s*((?:[A-Z]{3}|Rs\.?|LKR|INR|USD|GBP|EUR|\$|£|€)\s?[0-9][0-9,]*(?:\.[0-9]{2})?)/i));

  // ---- bank ----
  put("bankBalance", grab(t, /\b(?:closing balance|available balance|current balance|ledger balance|balance as at[^:]*|balance)\s*[:\-]?\s*((?:[A-Z]{3}|Rs\.?|\$|£|€)?\s?[0-9][0-9,]{2,}(?:\.[0-9]{2})?)/i));
  put("accountHolder", grab(t, /\b(?:account holder|account name|customer name)\s*[:\-]?\s*([A-Z][A-Za-z.' ]{3,50})/i));

  // ---- English test ----
  const test = grab(t, /\b(IELTS|PTE(?: Academic)?|TOEFL(?: iBT)?|Duolingo|OET|Cambridge)\b/i);
  if (test) {
    put("englishTest", test.toUpperCase());
    put("englishScore", grab(t, /\b(?:overall(?: band)?(?: score)?|overall score|total score)\s*[:\-]?\s*([0-9]{1,3}(?:\.[05])?)/i));
  }
  if (/medium of instruction|\bMOI\b|taught (?:entirely )?in english/i.test(t)) put("englishTest", "English waiver (MOI / taught in English)");

  // ---- study ----
  put("institution", grab(t, /\b([A-Z][A-Za-z.&' ]{2,60}(?:University|College|Institute|School|Academy))\b/));
  put("course", grab(t, /\b((?:Master|Bachelor|Doctor|Graduate Certificate|Graduate Diploma|Advanced Diploma|Diploma) (?:of|in) [A-Z][A-Za-z&() ]{2,60}?)(?=\s{2,}|\n|\s+Campus|\s+CRICOS|\s+\d|$)/m));
  const dur = t.match(/\b(\d{1,2})\s*Year\(?s?\)?/) ?? t.match(/\bduration\s*[:\-]?\s*(\d{1,2})\s*years?/i);
  if (dur) put("duration", `${dur[1]} year${dur[1] === "1" ? "" : "s"}`);
  put("course", grab(t, /\b(?:course(?: title| name)?|programme|program)\s*[:\-]?\s*([A-Z][A-Za-z()&,' -]{4,80})/i));
  // university / campus address (Australia, UK, generic "number + street, city, state + postcode")
  {
    const flat = t.replace(/\s+/g, " ");
    const au = flat.match(/((?:[A-Z][a-z]+ )?Campus )?(\d{1,5}[A-Za-z]? [A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)* (?:Drive|Road|Street|St|Avenue|Ave|Lane|Way|Place|Terrace|Boulevard|Parade|Highway|Circuit|Crescent)(?:,? [A-Z][A-Za-z]+){0,2},? (?:Western Australia|New South Wales|Victoria|Queensland|South Australia|Tasmania|Northern Territory|Australian Capital Territory|WA|NSW|VIC|QLD|SA|TAS|NT|ACT) \d{4})/);
    const uk = flat.match(/(\d{1,5}[A-Za-z]? [A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)* (?:Road|Street|Lane|Avenue|Way|Place|Square|Drive|Hill|Park)(?:,? [A-Z][A-Za-z]+){0,3},? [A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})\b/);
    const addr = au ? `${au[1] ? au[1].trim() + ", " : ""}${au[2]}` : uk?.[1];
    if (addr) put("institutionAddress", addr.replace(/ (Western Australia|New South Wales|Victoria|Queensland|South Australia|Tasmania)/, ", $1"));
  }
  put("campus", grab(t, /\b([A-Z][a-z]+(?: [A-Z][a-z]+)? Campus)\b/));
  put("cricos", grab(t, /\bCRICOS(?: Course)?(?: Code)?\s*[:\-]?\s*(\d{6}[A-Z])\b/i)?.replace(/^/, "CRICOS "));
  {
    const sch = t.match(/awarded (?:the |a )?([A-Z][A-Za-z' ]{3,60}Scholarship)/)?.[1];
    const pct = t.match(/(\d{1,3})\s*(?:per cent|percent|%)\s*(?:fee|tuition)\s*(?:reduction|discount|waiver)/i)?.[1];
    if (sch) put("scholarship", `${sch}${pct ? ` (${pct}% fee reduction)` : ""}`);
  }
  put("courseStart", grab(t, new RegExp(`\\b(?:course start date|course start|start date|commencement date|commencing)\\s*[:\\-]?\\s*${DATE}`, "i")));

  // normalise dates
  for (const k of ["dob", "passportIssue", "passportExpiry", "courseStart"]) {
    const v = out.get(k);
    if (v) out.set(k, toIsoDate(v));
  }
  if (!out.has("fullName") && (out.has("givenNames") || out.has("surname"))) out.set("fullName", `${out.get("givenNames") ?? ""} ${out.get("surname") ?? ""}`.trim());

  return [...out].map(([key, value]) => ({ key, label: DETAIL_LABELS[key] ?? key, value, source }));
}

/** Parse "LKR 1,250,000.00" → 1250000 */
export function parseAmount(v?: string) {
  if (!v) return undefined;
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Map extracted details to the guided application form keys (see formSchema). */
export function detailsToFormValues(details: Detail[]): Record<string, string> {
  const get = (k: string) => details.find((d) => d.key === k)?.value;
  const v: Record<string, string> = {};
  const map: Record<string, string> = {
    surname: "surname", givenNames: "givenNames", passportNo: "passportNo", dob: "dob", sex: "sex",
    passportIssue: "passportIssue", passportExpiry: "passportExpiry", placeOfBirth: "placeOfBirth",
    nationalId: "nationalId", email: "email", phone: "phone", address: "address", employer: "employer",
    occupation: "occupation", income: "income", maritalStatus: "maritalStatus",
    // country-specific form questions
    institution: "x_institution", course: "x_course", courseStart: "x_courseStart", bankBalance: "x_livingFunds",
  };
  for (const [from, to] of Object.entries(map)) {
    const x = get(from);
    if (x) v[to] = x;
  }
  const nat = get("nationality");
  if (nat) v.nationality = nat;
  if (!v.surname && !v.givenNames && get("fullName")) {
    const parts = get("fullName")!.split(/\s+/);
    v.surname = parts.pop() ?? "";
    v.givenNames = parts.join(" ");
  }
  return v;
}
