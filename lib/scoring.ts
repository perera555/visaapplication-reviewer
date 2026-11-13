import type { DocRequirement, VisaTypeId } from "./requirements";

export type Profile = {
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  age: number | "";
  passportExpiry: string; // yyyy-mm-dd
  travelDate: string; // yyyy-mm-dd
  stayDays: number | "";
  employment: "employed" | "self-employed" | "student" | "unemployed" | "retired" | "";
  monthlyIncomeUSD: number | "";
  savingsUSD: number | "";
  travelHistory: "none" | "regional" | "some-developed" | "frequent-developed" | "";
  previousRefusals: number | "";
  refusedThisCountry: boolean;
  overstayOrViolation: boolean;
  criminalRecord: boolean;
  propertyOrFamilyTies: boolean;
  dependentsAtHome: boolean;
  sponsor: boolean;
  englishScore: number | ""; // IELTS-equivalent band
  hasOfferOrInvitation: boolean;
};

export const EMPTY_PROFILE: Profile = {
  fullName: "", email: "", phone: "", nationality: "", age: "", passportExpiry: "", travelDate: "",
  stayDays: "", employment: "", monthlyIncomeUSD: "", savingsUSD: "", travelHistory: "",
  previousRefusals: "", refusedThisCountry: false, overstayOrViolation: false, criminalRecord: false,
  propertyOrFamilyTies: false, dependentsAtHome: false, sponsor: false, englishScore: "", hasOfferOrInvitation: false,
};

export type DocStatus = { reqId: string; provided: boolean; fileName?: string; note?: string };

export type Factor = { label: string; impact: number; detail: string };

export type Assessment = {
  score: number; // 0..100
  docScore: number; // 0..100
  profileScore: number; // 0..100
  status: "ready" | "almost" | "incomplete" | "high-risk";
  statusLabel: string;
  missingMandatory: DocRequirement[];
  missingOptional: DocRequirement[];
  factors: Factor[];
  nextSteps: string[];
};

const n = (v: number | "") => (typeof v === "number" && !Number.isNaN(v) ? v : 0);

/** Very rough minimum funds the officer will expect, in USD. */
export function expectedFundsUSD(visaType: VisaTypeId, stayDays: number, highCost: boolean) {
  const days = Math.max(stayDays || 14, 1);
  const daily = highCost ? 150 : 90;
  switch (visaType) {
    case "student":
      return highCost ? 35000 : 15000;
    case "work":
      return 2500;
    case "residence":
      return 12000;
    case "working-holiday":
      return 3500;
    case "family":
      return 3000;
    case "transit":
      return 300;
    default:
      return days * daily + 1000;
  }
}

const HIGH_COST = new Set(["GB", "US", "CA", "AU", "NZ", "IE", "CH", "NO", "DK", "SE", "FI", "DE", "FR", "NL", "BE", "AT", "LU", "IS", "JP", "SG", "AE"]);

export function assess(
  countryCode: string,
  visaType: VisaTypeId,
  requirements: DocRequirement[],
  docs: DocStatus[],
  p: Profile,
): Assessment {
  const provided = new Set(docs.filter((x) => x.provided).map((x) => x.reqId));
  const missingMandatory = requirements.filter((r) => r.mandatory && !provided.has(r.id));
  const missingOptional = requirements.filter((r) => !r.mandatory && !provided.has(r.id));

  // ---- documents (weighted) ----
  const totalW = requirements.reduce((s, r) => s + r.weight * (r.mandatory ? 2 : 1), 0) || 1;
  const gotW = requirements.filter((r) => provided.has(r.id)).reduce((s, r) => s + r.weight * (r.mandatory ? 2 : 1), 0);
  const docScore = Math.round((gotW / totalW) * 100);

  // ---- profile ----
  const factors: Factor[] = [];
  let profile = 60;
  const add = (label: string, impact: number, detail: string) => {
    factors.push({ label, impact, detail });
    profile += impact;
  };

  const highCost = HIGH_COST.has(countryCode.toUpperCase());
  const need = expectedFundsUSD(visaType, n(p.stayDays), highCost);
  const funds = n(p.savingsUSD) + (p.sponsor ? need * 0.5 : 0);
  if (p.savingsUSD === "") add("Funds not entered", -5, "Enter your available savings so funds can be checked.");
  else if (funds >= need * 1.5) add("Strong funds", 12, `Funds comfortably exceed the ~$${need.toLocaleString()} typically expected.`);
  else if (funds >= need) add("Sufficient funds", 6, `Funds meet the ~$${need.toLocaleString()} typically expected.`);
  else add("Insufficient funds", -18, `Officers usually expect around $${need.toLocaleString()} for this application; you show ~$${Math.round(funds).toLocaleString()}.`);

  if (visaType !== "student" && visaType !== "working-holiday") {
    if (p.employment === "employed" || p.employment === "self-employed") add("Stable employment / business", 8, "Ongoing employment or business is a strong reason to return.");
    else if (p.employment === "retired") add("Retired", 2, "Show pension income and assets.");
    else if (p.employment === "unemployed") add("Unemployed", -12, "No current employment weakens home-country ties; strengthen with sponsor and assets.");
  }

  if (p.propertyOrFamilyTies) add("Property / family ties", 6, "Assets and family at home show intention to return.");
  if (p.dependentsAtHome) add("Dependents at home", 3, "Dependents staying behind are a recognised tie.");

  switch (p.travelHistory) {
    case "frequent-developed": add("Excellent travel history", 12, "Previous visits to countries like UK/US/Schengen and complied."); break;
    case "some-developed": add("Good travel history", 7, "Some previous travel to developed countries."); break;
    case "regional": add("Regional travel only", 2, "Some travel history."); break;
    case "none": add("No travel history", -6, "First-time travellers face more scrutiny — strong ties and funds matter more."); break;
  }

  const refusals = n(p.previousRefusals);
  if (refusals > 0) add(`${refusals} previous refusal(s)`, -Math.min(6 * refusals + (p.refusedThisCountry ? 6 : 0), 24), "Previous refusals must be disclosed and their reasons fixed in this application.");
  if (p.overstayOrViolation) add("Previous overstay / violation", -25, "Immigration breaches are a serious negative factor and may trigger re-entry bans.");
  if (p.criminalRecord) add("Criminal record", -20, "May lead to refusal on character grounds — legal advice recommended.");

  if (visaType === "student" || visaType === "work" || visaType === "residence") {
    const e = n(p.englishScore);
    if (p.englishScore === "") add("No language score", -4, "Enter your IELTS-equivalent score.");
    else if (e >= 7) add("Strong English", 8, `Band ${e} comfortably meets most requirements.`);
    else if (e >= 6) add("Acceptable English", 4, `Band ${e} meets many course/visa minimums.`);
    else add("Low English score", -10, `Band ${e} may be below course or visa requirements.`);
  }

  if (["student", "work", "business", "family", "medical"].includes(visaType)) {
    if (p.hasOfferOrInvitation) add("Offer / invitation in hand", 8, "Confirmed offer, sponsorship or invitation.");
    else add("No offer / invitation yet", -15, "This visa type needs a confirmed offer, sponsor or invitation before applying.");
  }

  if (p.passportExpiry && p.travelDate) {
    const exp = new Date(p.passportExpiry).getTime();
    const ret = new Date(p.travelDate).getTime() + n(p.stayDays) * 86400000;
    if (exp < ret + 182 * 86400000) add("Passport validity too short", -15, "Passport should be valid 6+ months after your stay — renew before applying.");
  }

  const age = n(p.age);
  if (visaType === "working-holiday" && age > 0 && (age < 18 || age > 35)) add("Age outside working-holiday range", -30, "Most working holiday programs are for ages 18–30 or 18–35.");

  const profileScore = Math.max(0, Math.min(100, Math.round(profile)));

  // ---- overall ----
  let score = Math.round(docScore * 0.5 + profileScore * 0.5);
  if (missingMandatory.length > 0) score = Math.min(score, 55 - Math.min(missingMandatory.length * 3, 30));
  if (p.overstayOrViolation || p.criminalRecord) score = Math.min(score, 45);
  score = Math.max(0, Math.min(100, score));

  let status: Assessment["status"];
  let statusLabel: string;
  if (p.overstayOrViolation || p.criminalRecord || profileScore < 40) {
    status = "high-risk";
    statusLabel = "High risk — get advice before submitting";
  } else if (missingMandatory.length > 0) {
    status = "incomplete";
    statusLabel = `Not ready — ${missingMandatory.length} required document(s) missing`;
  } else if (score >= 80) {
    status = "ready";
    statusLabel = "Ready to submit";
  } else {
    status = "almost";
    statusLabel = "Almost ready — strengthen weak areas";
  }

  const nextSteps: string[] = [];
  missingMandatory.forEach((r) => nextSteps.push(`Add required document: ${r.name}`));
  factors.filter((f) => f.impact < 0).forEach((f) => nextSteps.push(f.detail));
  missingOptional.filter((r) => r.weight >= 2).slice(0, 4).forEach((r) => nextSteps.push(`Recommended: ${r.name} — ${r.description}`));
  if (nextSteps.length === 0) nextSteps.push("Everything looks strong. Double-check names/dates match across all documents, then submit.");

  return { score, docScore, profileScore, status, statusLabel, missingMandatory, missingOptional, factors, nextSteps };
}

/** Match an uploaded file (by its name and optional extracted text) to the best requirement. */
export function classifyDocument(fileName: string, text: string, requirements: DocRequirement[]): DocRequirement | undefined {
  const hay = `${fileName.replace(/[_\-.]+/g, " ")} ${text.slice(0, 6000)}`.toLowerCase();
  let best: { r: DocRequirement; s: number } | undefined;
  for (const r of requirements) {
    let s = 0;
    for (const k of r.keywords) {
      const kw = k.toLowerCase();
      if (fileName.toLowerCase().replace(/[_\-.]+/g, " ").includes(kw)) s += 5;
      else if (hay.includes(kw)) s += 1;
    }
    if (s > 0 && (!best || s > best.s)) best = { r, s };
  }
  return best?.r;
}
