import { SCHENGEN, getCountry } from "./countries";

export type VisaTypeId =
  | "visit"
  | "student"
  | "work"
  | "business"
  | "family"
  | "transit"
  | "medical"
  | "working-holiday"
  | "residence";

export const VISA_TYPES: { id: VisaTypeId; name: string; icon: string; blurb: string }[] = [
  { id: "visit", name: "Visit / Tourist", icon: "🏖️", blurb: "Holidays, visiting friends & family, short trips" },
  { id: "student", name: "Student", icon: "🎓", blurb: "University, college, language or vocational study" },
  { id: "work", name: "Work / Skilled", icon: "💼", blurb: "Employment with a sponsoring employer" },
  { id: "business", name: "Business", icon: "🤝", blurb: "Meetings, conferences, short business trips" },
  { id: "family", name: "Family / Spouse", icon: "👨‍👩‍👧", blurb: "Join a spouse, partner, parent or child" },
  { id: "transit", name: "Transit", icon: "✈️", blurb: "Passing through on the way to another country" },
  { id: "medical", name: "Medical", icon: "🏥", blurb: "Treatment at a hospital or clinic abroad" },
  { id: "working-holiday", name: "Working Holiday", icon: "🎒", blurb: "Travel and work for young people (age-limited)" },
  { id: "residence", name: "Permanent Residence / Migration", icon: "🏠", blurb: "Long-term migration, PR, golden visas" },
];

export function visaTypeName(id: string) {
  return VISA_TYPES.find((v) => v.id === id)?.name ?? id;
}

export type DocCategory = "identity" | "financial" | "purpose" | "ties" | "travel" | "supporting";

export type DocRequirement = {
  id: string;
  name: string;
  description: string;
  mandatory: boolean;
  /** 1 = helpful, 2 = important, 3 = critical */
  weight: 1 | 2 | 3;
  category: DocCategory;
  /** words used to auto-recognise an uploaded file by its name or text */
  keywords: string[];
  source?: "standard" | "country" | "admin";
};

const d = (
  id: string,
  name: string,
  description: string,
  mandatory: boolean,
  weight: 1 | 2 | 3,
  category: DocCategory,
  keywords: string[],
): DocRequirement => ({ id, name, description, mandatory, weight, category, keywords, source: "standard" });

// ---------- documents every visa application needs ----------
const BASE: DocRequirement[] = [
  d("passport", "Valid passport", "Valid for at least 6 months beyond your stay, with 2+ blank pages. Include copies of the bio page and all previous visas.", true, 3, "identity", ["passport", "bio page", "biodata"]),
  d("photo", "Passport-size photographs", "Recent colour photos that meet the destination's size/background rules (usually 35x45mm, white background).", true, 2, "identity", ["photo", "photograph", "picture"]),
  d("application-form", "Completed visa application form", "Signed official application form or online-form confirmation page.", true, 3, "identity", ["application form", "form", "confirmation", "ds-160", "ds160", "vaf"]),
  d("fee-receipt", "Visa fee payment receipt", "Proof that the application fee (and any surcharge) has been paid.", true, 2, "identity", ["receipt", "fee", "payment"]),
  d("national-id", "National ID card / birth certificate", "Copy of national identity card; birth certificate if minors or family applications.", false, 1, "identity", ["national id", "nic", "identity card", "birth certificate"]),
  d("previous-visas", "Previous visas & travel history", "Copies of old passports, previous visas and entry/exit stamps — strong travel history improves approval chances.", false, 2, "travel", ["previous visa", "old passport", "travel history", "stamp"]),
];

// ---------- documents by visa type ----------
const BY_TYPE: Record<VisaTypeId, DocRequirement[]> = {
  visit: [
    d("bank-statements", "Bank statements (last 6 months)", "Personal bank statements showing a steady balance sufficient for the trip. Avoid unexplained large deposits.", true, 3, "financial", ["bank statement", "statement", "account", "balance"]),
    d("employment-letter", "Employment / leave approval letter", "Letter from employer on letterhead stating position, salary, start date and approved leave dates.", true, 3, "ties", ["employment letter", "employer", "leave", "noc", "no objection", "service letter"]),
    d("payslips", "Payslips (last 3–6 months)", "Recent salary slips matching the salary credits on the bank statement.", false, 2, "financial", ["payslip", "pay slip", "salary slip", "salary"]),
    d("itinerary", "Travel itinerary & flight reservation", "Day-by-day plan and a return flight reservation (not necessarily a paid ticket).", true, 2, "purpose", ["itinerary", "flight", "ticket", "booking", "reservation"]),
    d("accommodation", "Accommodation proof", "Hotel bookings or a host's invitation letter with their address and ID/status.", true, 2, "purpose", ["hotel", "accommodation", "booking", "airbnb", "invitation"]),
    d("ties-home", "Proof of ties to home country", "Property deeds, family certificates, business registration, ongoing study — anything showing you will return.", false, 3, "ties", ["deed", "property", "marriage certificate", "business registration", "land"]),
    d("tax-returns", "Income tax returns", "Last 1–2 years of tax returns or tax clearance.", false, 1, "financial", ["tax", "itr", "tax return"]),
    d("cover-letter", "Cover letter", "Explains purpose of visit, who pays, travel dates and why you will return.", false, 2, "purpose", ["cover letter", "covering letter", "purpose letter"]),
  ],
  student: [
    d("admission-letter", "Offer / admission letter (CAS, I-20, LOA, CoE)", "Unconditional offer or the official confirmation document from a licensed institution.", true, 3, "purpose", ["offer letter", "admission", "cas", "i-20", "i20", "loa", "letter of acceptance", "coe", "confirmation of enrolment", "unconditional"]),
    d("academic-transcripts", "Academic certificates & transcripts", "Degree/diploma certificates and transcripts used to obtain the offer.", true, 3, "purpose", ["transcript", "certificate", "degree", "diploma", "o/l", "a/l", "result"]),
    d("english-test", "English language test result", "IELTS / PTE / TOEFL / Duolingo result meeting course and visa requirements.", true, 3, "purpose", ["ielts", "pte", "toefl", "duolingo", "english", "language test"]),
    d("tuition-receipt", "Tuition fee payment receipt", "Proof of deposit or full first-year tuition payment.", false, 2, "financial", ["tuition", "deposit", "fee receipt"]),
    d("bank-statements", "Proof of funds (tuition + living costs)", "Bank statements/education loan showing funds held for the required period (e.g. 28 days for UK).", true, 3, "financial", ["bank statement", "balance", "loan", "fund", "fixed deposit"]),
    d("sponsor-docs", "Sponsor letter & sponsor's income proof", "If parents/relatives fund you: affidavit of support, their bank statements, income and relationship proof.", false, 2, "financial", ["sponsor", "affidavit", "support letter", "parent"]),
    d("sop", "Statement of purpose / Genuine student statement", "Explains why this course, institution and country, and your career plan back home.", true, 3, "purpose", ["sop", "statement of purpose", "gte", "genuine student", "personal statement", "study plan"]),
    d("cv", "CV / resume (with gap explanation)", "Explain study gaps with work experience letters.", false, 1, "purpose", ["cv", "resume", "curriculum"]),
    d("medical", "Medical exam / TB test", "Where required by the destination (e.g. UK TB test, Australia/Canada/NZ health exam).", false, 2, "supporting", ["medical", "tb test", "tuberculosis", "health"]),
    d("insurance", "Health insurance (OSHC/students)", "Student health cover where required.", false, 2, "supporting", ["insurance", "oshc", "health cover"]),
  ],
  work: [
    d("job-offer", "Job offer / employment contract", "Signed contract showing role, salary, hours and duration.", true, 3, "purpose", ["job offer", "contract", "offer of employment", "appointment letter"]),
    d("sponsorship", "Sponsorship / work permit approval", "Certificate of Sponsorship, LMIA, petition approval, work permit or in-principle approval.", true, 3, "purpose", ["cos", "certificate of sponsorship", "lmia", "petition", "work permit", "ipa", "approval", "i-797"]),
    d("qualifications", "Qualification certificates", "Degrees, diplomas, professional licences relevant to the job.", true, 3, "purpose", ["degree", "certificate", "diploma", "licence", "license"]),
    d("experience-letters", "Work experience letters", "Previous employer letters with dates, duties and salary.", true, 2, "purpose", ["experience letter", "service letter", "reference"]),
    d("cv", "CV / resume", "Up-to-date CV matching the job and experience letters.", false, 2, "purpose", ["cv", "resume"]),
    d("english-test", "English / language test", "Where the route requires it (e.g. UK Skilled Worker B1).", false, 2, "purpose", ["ielts", "pte", "toefl", "language"]),
    d("police-clearance", "Police clearance certificate", "Criminal record certificate from countries lived in.", false, 2, "supporting", ["police", "clearance", "criminal record", "pcc"]),
    d("medical", "Medical examination", "Health exam/TB test where required.", false, 2, "supporting", ["medical", "tb test", "health"]),
    d("bank-statements", "Maintenance funds", "Bank statements unless the employer certifies maintenance.", false, 1, "financial", ["bank statement", "balance"]),
  ],
  business: [
    d("invitation-business", "Invitation letter from host company", "On letterhead, stating purpose, dates, who pays and host company registration.", true, 3, "purpose", ["invitation", "invite", "host company"]),
    d("employer-letter", "Letter from your employer / company", "Confirms your position, purpose of trip and that costs are covered.", true, 3, "ties", ["employer", "company letter", "noc", "employment letter"]),
    d("company-registration", "Company registration & financials", "Business registration, trade licence and company bank statements if self-employed/director.", false, 2, "ties", ["registration", "trade licence", "br", "incorporation"]),
    d("bank-statements", "Bank statements (6 months)", "Personal and/or company bank statements.", true, 2, "financial", ["bank statement", "balance"]),
    d("itinerary", "Itinerary, flights & hotel", "Meeting schedule, return flight reservation and accommodation.", true, 2, "purpose", ["itinerary", "flight", "hotel", "booking"]),
  ],
  family: [
    d("relationship-proof", "Relationship proof", "Marriage/birth certificates, photos together, communication history, joint documents.", true, 3, "purpose", ["marriage certificate", "birth certificate", "relationship", "photos", "chat"]),
    d("sponsor-status", "Sponsor's status in destination", "Sponsor's passport, visa/residence permit or citizenship proof.", true, 3, "purpose", ["residence permit", "brp", "green card", "pr card", "citizenship", "sponsor passport"]),
    d("sponsor-financial", "Sponsor's income & financial proof", "Payslips, employment letter, bank statements and tax returns of the sponsor (meets income threshold).", true, 3, "financial", ["payslip", "bank statement", "income", "sponsor", "tax"]),
    d("accommodation-family", "Accommodation in destination", "Tenancy agreement or property ownership showing adequate housing.", true, 2, "purpose", ["tenancy", "lease", "rental", "property", "accommodation"]),
    d("english-test", "Language test (if required)", "e.g. A1/A2 English for UK spouse visa.", false, 2, "purpose", ["ielts", "a1", "a2", "english", "language"]),
    d("medical", "Medical / TB test", "Where required.", false, 1, "supporting", ["medical", "tb"]),
  ],
  transit: [
    d("onward-ticket", "Confirmed onward ticket", "Ticket for your connecting flight out of the transit country.", true, 3, "purpose", ["ticket", "flight", "e-ticket", "itinerary"]),
    d("destination-visa", "Visa for final destination", "Valid visa or residence permit for the country you are travelling to.", true, 3, "purpose", ["visa", "residence permit", "destination"]),
  ],
  medical: [
    d("hospital-letter", "Hospital appointment / acceptance letter", "Letter from the treating hospital confirming diagnosis, treatment plan, duration and estimated cost.", true, 3, "purpose", ["hospital", "appointment", "treatment", "clinic"]),
    d("medical-reports", "Medical reports from home doctor", "Referral and medical history.", true, 3, "purpose", ["medical report", "referral", "doctor", "diagnosis"]),
    d("bank-statements", "Proof of funds for treatment", "Bank statements, insurance or sponsor covering treatment and stay.", true, 3, "financial", ["bank statement", "balance", "insurance"]),
    d("accommodation", "Accommodation for patient & attendant", "Hotel/host arrangements.", false, 1, "purpose", ["hotel", "accommodation"]),
  ],
  "working-holiday": [
    d("bank-statements", "Proof of funds", "Minimum savings required by the program (e.g. AUD 5,000 / NZD 4,200).", true, 3, "financial", ["bank statement", "balance"]),
    d("return-ticket", "Return ticket or funds for one", "Onward/return flight or extra funds.", false, 2, "travel", ["ticket", "flight"]),
    d("insurance", "Travel & health insurance", "Cover for the full stay.", true, 2, "supporting", ["insurance"]),
    d("police-clearance", "Police clearance", "Where requested.", false, 1, "supporting", ["police", "clearance"]),
  ],
  residence: [
    d("eligibility-assessment", "Skills assessment / points eligibility", "Skills assessment, Express Entry profile, EOI or invitation to apply.", true, 3, "purpose", ["skills assessment", "ita", "invitation to apply", "eoi", "express entry", "points"]),
    d("qualifications", "Education credential assessment", "Degrees plus ECA/WES or equivalent.", true, 3, "purpose", ["eca", "wes", "degree", "credential"]),
    d("experience-letters", "Employment reference letters", "Detailed letters covering all claimed experience.", true, 3, "purpose", ["reference", "experience letter", "employment"]),
    d("english-test", "Language test", "IELTS/CELPIP/PTE/TEF meeting the minimum scores.", true, 3, "purpose", ["ielts", "celpip", "pte", "tef"]),
    d("settlement-funds", "Proof of settlement funds", "Bank letters showing required settlement funds.", true, 2, "financial", ["bank letter", "settlement", "funds"]),
    d("police-clearance", "Police clearance certificates", "From every country lived in 6+ months.", true, 2, "supporting", ["police", "clearance", "pcc"]),
    d("medical", "Immigration medical exam", "From a panel physician.", true, 2, "supporting", ["medical", "panel physician", "health"]),
  ],
};

// ---------- country profiles: process + country-specific documents ----------
export type CountryProfile = {
  portal?: { name: string; url: string };
  formName?: string;
  biometrics?: boolean;
  interview?: string;
  processing?: string;
  notes?: string[];
  extraDocs?: Partial<Record<VisaTypeId | "all", DocRequirement[]>>;
  refusalOptions?: string[];
};

const c = (id: string, name: string, description: string, mandatory: boolean, weight: 1 | 2 | 3, category: DocCategory, keywords: string[]): DocRequirement => ({
  ...d(id, name, description, mandatory, weight, category, keywords),
  source: "country",
});

const schengenInsurance = c("travel-insurance", "Schengen travel medical insurance", "Minimum €30,000 coverage valid in all Schengen states for the entire stay, including repatriation.", true, 3, "supporting", ["insurance", "travel insurance", "medical insurance"]);

export const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  GB: {
    portal: { name: "GOV.UK – Visas and immigration", url: "https://www.gov.uk/browse/visas-immigration" },
    formName: "Online application on GOV.UK (VAF) + biometrics at VFS/TLS",
    biometrics: true,
    processing: "Visitor: ~3 weeks · Student/Skilled Worker: ~3 weeks from biometrics",
    notes: [
      "Apply online, pay fee and Immigration Health Surcharge (for visas over 6 months), then book biometrics.",
      "Student: funds must be held for 28 consecutive days and the statement dated within 31 days of applying.",
      "TB test is required if you are a resident of a listed country and staying over 6 months.",
    ],
    extraDocs: {
      student: [c("atas", "ATAS certificate (if applicable)", "Required for certain postgraduate science/engineering courses.", false, 2, "purpose", ["atas"]), c("tb-test", "TB test certificate", "From an approved clinic if from a listed country.", false, 2, "supporting", ["tb test", "tuberculosis"])],
      work: [c("ihs", "Immigration Health Surcharge payment", "IHS reference number.", true, 2, "supporting", ["ihs", "health surcharge"])],
    },
    refusalOptions: [
      "Most UK visit visa refusals have no right of appeal or administrative review — you fix the reasons and re-apply.",
      "Student / Skilled Worker refusals (out of country) can usually request Administrative Review within 28 days.",
      "Human-rights / family refusals may carry a right of appeal to the First-tier Tribunal.",
      "If refused for deception (paragraph 9.7.1 / 9.7.2), a re-entry ban of up to 10 years can apply — seek legal advice.",
    ],
  },
  US: {
    portal: { name: "U.S. Department of State – Visas", url: "https://travel.state.gov/content/travel/en/us-visas.html" },
    formName: "DS-160 (non-immigrant) online at ceac.state.gov",
    biometrics: true,
    interview: "In-person interview at the U.S. Embassy/Consulate is normally required.",
    processing: "Depends on interview wait times at your consulate",
    notes: [
      "Fill DS-160, pay MRV fee, book interview, attend fingerprinting (OFC) where applicable.",
      "Students need an I-20 from a SEVP school and must pay the I-901 SEVIS fee.",
      "Work visas (H-1B, L-1, O-1) need an approved petition (Form I-797).",
    ],
    extraDocs: {
      all: [c("ds160", "DS-160 confirmation page", "Barcode confirmation page of the submitted DS-160.", true, 3, "identity", ["ds-160", "ds160", "confirmation"]), c("interview-appointment", "Interview appointment letter", "Appointment confirmation.", true, 2, "identity", ["appointment", "interview"])],
      student: [c("sevis", "I-901 SEVIS fee receipt", "Proof of SEVIS fee payment.", true, 3, "financial", ["sevis", "i-901", "i901"])],
      work: [c("i797", "Form I-797 petition approval", "Approved USCIS petition.", true, 3, "purpose", ["i-797", "i797", "petition"])],
    },
    refusalOptions: [
      "Section 214(b) refusals cannot be appealed. Re-apply when your circumstances or documents have meaningfully changed.",
      "221(g) refusals mean administrative processing / missing documents — submit what the consulate requests.",
      "Ineligibility under 212(a) may need a waiver — consult an immigration attorney.",
    ],
  },
  CA: {
    portal: { name: "IRCC – Immigration and citizenship", url: "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
    formName: "IRCC secure account online application (IMM 5257 for visitors, study permit application)",
    biometrics: true,
    processing: "Varies by country — check IRCC processing times tool",
    notes: [
      "Students need a Letter of Acceptance from a DLI and (in most cases) a Provincial Attestation Letter (PAL).",
      "Visitors must show ties to home country and funds — family information form (IMM 5707/5645) is required.",
    ],
    extraDocs: {
      all: [c("family-info", "Family information form (IMM 5707 / IMM 5645)", "Details of all family members.", true, 2, "ties", ["imm 5707", "imm 5645", "family information"])],
      student: [c("pal", "Provincial Attestation Letter (PAL)", "From the province where you will study (if required).", true, 3, "purpose", ["pal", "attestation"]), c("gic", "GIC certificate", "Guaranteed Investment Certificate as proof of living funds.", false, 2, "financial", ["gic", "guaranteed investment"])],
      work: [c("lmia", "LMIA or employer compliance number", "Positive LMIA or LMIA-exempt offer number.", true, 3, "purpose", ["lmia", "offer of employment number"])],
    },
    refusalOptions: [
      "Order GCMS notes (via ATIP) to see the officer's full reasoning before you re-apply.",
      "You may request reconsideration if the officer made a clear error, or seek Judicial Review at the Federal Court within 15/60 days.",
      "Most applicants re-apply with stronger documents addressing every refusal ground.",
    ],
  },
  AU: {
    portal: { name: "Department of Home Affairs – ImmiAccount", url: "https://immi.homeaffairs.gov.au/" },
    formName: "Online application in ImmiAccount",
    biometrics: true,
    processing: "Varies by subclass",
    notes: [
      "Student (subclass 500): need CoE, Genuine Student (GS) answers, OSHC and financial capacity.",
      "Visitor (subclass 600): show genuine temporary stay and sufficient funds.",
    ],
    extraDocs: {
      student: [c("oshc", "Overseas Student Health Cover (OSHC)", "Cover for the full visa duration.", true, 3, "supporting", ["oshc", "health cover"]), c("gs-statement", "Genuine Student (GS) answers", "Responses to the GS questions in the application.", true, 3, "purpose", ["genuine student", "gs", "gte"])],
    },
    refusalOptions: [
      "If refused onshore, you may be able to appeal to the Administrative Review Tribunal (ART) within the deadline in your letter.",
      "Offshore refusals usually have no review — re-apply with stronger evidence.",
    ],
  },
  NZ: {
    portal: { name: "Immigration New Zealand", url: "https://www.immigration.govt.nz/" },
    formName: "Online application on Immigration NZ",
    notes: ["Visitors from visa-waiver countries need an NZeTA instead of a visa."],
    extraDocs: { student: [c("insurance-nz", "Approved medical & travel insurance", "Required for international students.", true, 2, "supporting", ["insurance"])] },
    refusalOptions: ["Re-apply addressing concerns; some decisions can be reconsidered — check the decision letter."],
  },
  IE: {
    portal: { name: "Irish Immigration Service", url: "https://www.irishimmigration.ie/" },
    formName: "AVATS online application + supporting documents",
    notes: ["Ireland is not in Schengen — a separate Irish visa is needed."],
    refusalOptions: ["You can appeal an Irish visa refusal in writing within 2 months of the decision (one appeal per application)."],
  },
  JP: {
    portal: { name: "Ministry of Foreign Affairs of Japan – Visa", url: "https://www.mofa.go.jp/j_info/visit/visa/index.html" },
    notes: ["Many applications are submitted through accredited agencies at the Japanese embassy.", "Work/study visas require a Certificate of Eligibility (CoE)."],
    extraDocs: { student: [c("coe-jp", "Certificate of Eligibility (CoE)", "Issued by Japanese immigration.", true, 3, "purpose", ["certificate of eligibility", "coe"])], work: [c("coe-jp", "Certificate of Eligibility (CoE)", "Issued by Japanese immigration.", true, 3, "purpose", ["certificate of eligibility", "coe"])] },
    refusalOptions: ["Japan generally does not accept a re-application for the same purpose within 6 months of refusal."],
  },
  KR: { portal: { name: "Korea Visa Portal", url: "https://www.visa.go.kr/" }, notes: ["Check K-ETA eligibility for short visits."] },
  CN: { portal: { name: "China Visa Application Service Center", url: "https://www.visaforchina.cn/" } },
  IN: { portal: { name: "Indian Visa Online", url: "https://indianvisaonline.gov.in/" }, notes: ["e-Visa available for many nationalities (tourist, business, medical)."] },
  AE: {
    portal: { name: "UAE Government – Visas", url: "https://u.ae/en/information-and-services/visa-and-emirates-id" },
    notes: ["Most work/residence visas are sponsored by an employer or family member inside the UAE.", "Golden Visa available for investors, professionals and students meeting criteria."],
    extraDocs: { work: [c("entry-permit", "Entry permit from employer", "Employer-issued entry permit.", true, 3, "purpose", ["entry permit"])] },
  },
  SG: {
    portal: { name: "Immigration & Checkpoints Authority", url: "https://www.ica.gov.sg/" },
    notes: ["Work passes (EP, S Pass) are applied for by the employer via the Ministry of Manpower (mom.gov.sg)."],
    extraDocs: { work: [c("ipa", "In-Principle Approval (IPA)", "MOM approval letter.", true, 3, "purpose", ["ipa", "in-principle"])] },
  },
  MY: { portal: { name: "Immigration Department of Malaysia", url: "https://www.imi.gov.my/" }, notes: ["Students apply via EMGS (Education Malaysia Global Services)."] },
  TH: { portal: { name: "Thai e-Visa", url: "https://www.thaievisa.go.th/" } },
  SA: { portal: { name: "Saudi Visa Platform", url: "https://visa.mofa.gov.sa/" } },
  TR: { portal: { name: "Türkiye e-Visa", url: "https://www.evisa.gov.tr/" } },
  DE: { portal: { name: "German Federal Foreign Office – Visa", url: "https://www.auswaertiges-amt.de/en/visa-service" }, notes: ["Students usually need a blocked account (Sperrkonto) for living costs."], extraDocs: { student: [c("blocked-account", "Blocked account confirmation (Sperrkonto)", "Confirmation of the required yearly amount.", true, 3, "financial", ["blocked account", "sperrkonto", "expatrio", "fintiba"])] } },
  FR: { portal: { name: "France-Visas", url: "https://france-visas.gouv.fr/" }, extraDocs: { student: [c("campus-france", "Campus France registration", "Études en France procedure confirmation (where applicable).", true, 2, "purpose", ["campus france"])] } },
  IT: { portal: { name: "Visto per l'Italia", url: "https://vistoperitalia.esteri.it/" } },
  ES: { portal: { name: "Spanish Ministry of Foreign Affairs", url: "https://www.exteriores.gob.es/" } },
  NL: { portal: { name: "Netherlands Worldwide", url: "https://www.netherlandsworldwide.nl/" } },
};

function schengenProfile(code: string): CountryProfile {
  const own = COUNTRY_PROFILES[code] ?? {};
  return {
    formName: "Harmonised Schengen visa application form",
    biometrics: true,
    processing: "Standard: 15 calendar days (can extend to 45)",
    ...own,
    notes: [
      "Apply at the embassy/visa centre of the Schengen country of main destination (or first entry if equal).",
      "Apply at least 15 days and no more than 6 months before travel.",
      ...(own.notes ?? []),
    ],
    extraDocs: {
      ...own.extraDocs,
      visit: [schengenInsurance, ...(own.extraDocs?.visit ?? [])],
      business: [schengenInsurance, ...(own.extraDocs?.business ?? [])],
      medical: [schengenInsurance, ...(own.extraDocs?.medical ?? [])],
      transit: [schengenInsurance, ...(own.extraDocs?.transit ?? [])],
    },
    refusalOptions: own.refusalOptions ?? [
      "Schengen refusals use a standard form listing the ground(s) ticked by the consulate.",
      "You have a right to appeal — the deadline and the authority are stated in the refusal letter (often 15–30 days or 1 month).",
      "You can also re-apply at any time with documents addressing each ticked ground.",
    ],
  };
}

export function getCountryProfile(code: string): CountryProfile {
  const upper = code.toUpperCase();
  if (SCHENGEN.has(upper)) return schengenProfile(upper);
  return (
    COUNTRY_PROFILES[upper] ?? {
      notes: [
        `Check the official website of the ${getCountry(upper)?.name ?? upper} embassy or consulate in your country for the latest form and fees.`,
        "Many countries now offer e-Visas or visa-on-arrival for certain nationalities — check eligibility first.",
      ],
      refusalOptions: [
        "Read the refusal letter carefully for any appeal/review rights and deadlines.",
        "If no appeal is offered, re-apply with documents that directly address every refusal reason.",
      ],
    }
  );
}

/** Replaces the IELTS/PTE requirement when the applicant has an English test waiver. */
export const ENGLISH_WAIVER_DOC: DocRequirement = {
  id: "english-waiver",
  name: "English test waiver evidence (instead of IELTS/PTE)",
  description:
    "Medium of Instruction (MOI) letter from your university, a degree taught in English, a waiver letter from the university/employer, or proof of nationality from a majority English-speaking country. Confirm the embassy accepts the waiver for the visa itself, not just for admission.",
  mandatory: true,
  weight: 3,
  category: "purpose",
  keywords: ["moi", "medium of instruction", "waiver", "english proficiency", "english language waiver", "taught in english"],
  source: "standard",
};

/** Full standard checklist for a destination + visa type (admin-added items are merged on top in the UI). */
export function getRequirements(countryCode: string, visaType: VisaTypeId, opts: { englishWaiver?: boolean } = {}): DocRequirement[] {
  const profile = getCountryProfile(countryCode);
  const list = [...BASE, ...(BY_TYPE[visaType] ?? []), ...(profile.extraDocs?.all ?? []), ...(profile.extraDocs?.[visaType] ?? [])];
  const seen = new Set<string>();
  const unique = list.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  if (!opts.englishWaiver) return unique;
  const i = unique.findIndex((r) => r.id === "english-test");
  if (i >= 0) unique.splice(i, 1, ENGLISH_WAIVER_DOC);
  return unique;
}

/** Visa types where an English test (or waiver) usually matters. */
export const ENGLISH_TYPES: VisaTypeId[] = ["student", "work", "residence", "family"];

// ---------- how you apply: online, online + in person, or offline at the embassy ----------
export type ApplyMode = "online" | "hybrid" | "offline" | "check";

export const APPLY_MODE_INFO: Record<ApplyMode, { label: string; short: string; icon: string; className: string; detail: string }> = {
  online: { label: "Online (e-Visa)", short: "Online", icon: "🌐", className: "bg-emerald-100 text-emerald-800", detail: "Apply and pay fully online. The visa is issued electronically, with no embassy visit." },
  hybrid: { label: "Online + in-person", short: "Online + visit", icon: "🔁", className: "bg-cyan-100 text-cyan-800", detail: "Fill and pay online, then attend a visa centre or embassy for biometrics, interview or document submission." },
  offline: { label: "Offline (embassy)", short: "Offline", icon: "🏛️", className: "bg-amber-100 text-amber-800", detail: "Submit a paper application and documents in person at the embassy, consulate or an accredited agency." },
  check: { label: "Check embassy", short: "Check", icon: "❔", className: "bg-slate-100 text-slate-700", detail: "The method depends on your nationality. Many countries offer an e-Visa or visa on arrival. Confirm on the official embassy website." },
};

const MODE_BY_COUNTRY: Record<string, Partial<Record<VisaTypeId | "default", ApplyMode>>> = {
  GB: { default: "hybrid" }, US: { default: "hybrid" }, CA: { default: "hybrid" }, IE: { default: "hybrid" },
  AU: { default: "online" }, NZ: { default: "online" }, IN: { default: "online", student: "hybrid", work: "hybrid" },
  TR: { default: "online", student: "hybrid", work: "hybrid" }, TH: { default: "online" }, SA: { default: "online" },
  AE: { default: "online" }, QA: { default: "online" }, OM: { default: "online" }, BH: { default: "online" },
  SG: { default: "online" }, MY: { default: "online" }, KR: { default: "hybrid" }, JP: { default: "offline", visit: "hybrid" },
  CN: { default: "hybrid" }, VN: { default: "online" }, KH: { default: "online" }, LK: { default: "online" },
  KE: { default: "online" }, EG: { default: "online" }, AZ: { default: "online" }, GE: { default: "online" },
  ZA: { default: "hybrid" }, BR: { default: "online" }, RU: { default: "online", student: "offline", work: "offline" },
  ID: { default: "online" }, PH: { default: "hybrid" }, MX: { default: "offline" }, NG: { default: "online" },
};

export function getApplyMode(countryCode: string, visaType?: VisaTypeId): ApplyMode {
  const code = countryCode.toUpperCase();
  if (SCHENGEN.has(code)) return "hybrid"; // Schengen: form (often online) + in-person biometrics/submission
  const m = MODE_BY_COUNTRY[code];
  if (!m) return "check";
  return (visaType && m[visaType]) || m.default || "check";
}

/** Common application steps shown for every destination. */
export function getProcessSteps(countryCode: string, visaType: VisaTypeId): string[] {
  const p = getCountryProfile(countryCode);
  const steps = [
    "Confirm the exact visa category and whether your nationality needs a visa, e-Visa or eTA.",
    "Collect every document on the checklist — originals plus clear scanned copies.",
    p.formName ? `Complete the application: ${p.formName}.` : "Complete the official application form (online or paper).",
    "Pay the visa fee and keep the receipt.",
  ];
  if (p.biometrics) steps.push("Book and attend the biometrics (fingerprints/photo) appointment at the visa centre.");
  if (p.interview) steps.push(p.interview);
  if (visaType === "student") steps.push("Make sure your funds have been held for the required period before applying.");
  steps.push("Submit and track your application; respond quickly to any extra document requests.");
  return steps;
}
