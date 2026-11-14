// Country- and visa-specific application form sections, added on top of the standard form.
import { SCHENGEN, getCountry } from "./countries";
import { getApplyMode, getCountryProfile, visaTypeName, type VisaTypeId } from "./requirements";
import type { FormField, FormSection } from "./formSchema";

export type CountryForm = {
  title: string;
  officialForm: string;
  howToSubmit: string[];
  officialUrl?: string;
  sections: FormSection[];
};

const f = (key: string, label: string, type?: FormField["type"], options?: string[], aliases?: string[]): FormField => ({ key, label, type, options, aliases, wide: type === "textarea" });
const YN = ["No", "Yes"];

const COMMON_PURPOSE: Record<VisaTypeId, FormField[]> = {
  visit: [f("x_places", "Places you will visit", "textarea"), f("x_host", "Host / friends / relatives in the country (name, address, relationship)", "textarea"), f("x_tripCost", "Estimated total cost of the trip"), f("x_funds", "Funds available for the trip")],
  student: [f("x_institution", "University / college", undefined, undefined, ["institution", "school", "provider"]), f("x_course", "Course name", undefined, undefined, ["course", "program"]), f("x_courseStart", "Course start date", "date"), f("x_courseEnd", "Course end date", "date"), f("x_tuition", "Tuition fee (first year)"), f("x_tuitionPaid", "Tuition already paid"), f("x_livingFunds", "Funds for living costs"), f("x_fundSource", "Source of funds (self / parents / loan / scholarship)")],
  work: [f("x_employerDest", "Employer in destination country"), f("x_jobTitleDest", "Job title / occupation code"), f("x_salaryDest", "Offered salary"), f("x_startDest", "Job start date", "date"), f("x_sponsorRef", "Sponsorship / work permit reference number")],
  business: [f("x_hostCompany", "Host company name & address", "textarea"), f("x_meetingPurpose", "Purpose of meetings / conference", "textarea"), f("x_whoPays", "Who pays for the trip")],
  family: [f("x_sponsorName", "Sponsor's full name"), f("x_sponsorStatus", "Sponsor's status (citizen / PR / visa holder)"), f("x_relationship", "Relationship to sponsor"), f("x_relationshipSince", "Relationship since", "date"), f("x_sponsorIncome", "Sponsor's annual income")],
  transit: [f("x_finalDest", "Final destination country"), f("x_onwardFlight", "Onward flight number & date")],
  medical: [f("x_hospital", "Hospital / clinic name & address", "textarea"), f("x_treatment", "Treatment / condition"), f("x_treatmentCost", "Estimated treatment cost"), f("x_attendant", "Accompanying attendant (name, relationship)")],
  "working-holiday": [f("x_whFunds", "Savings available"), f("x_whPlans", "Plans for work and travel", "textarea")],
  residence: [f("x_program", "Immigration program / stream"), f("x_points", "Points score (if points-based)"), f("x_invitation", "Invitation / EOI / ITA number"), f("x_skillsAssessment", "Skills assessment reference")],
};

const DECLARATIONS = (country: string): FormSection => ({
  id: "x_character", title: "Health & character", icon: "⚖️",
  fields: [
    f("x_refusedAny", "Ever been refused a visa or entry to any country?", "select", YN),
    f("x_refusedDetails", "If yes: country, date, reason", "textarea"),
    f("x_overstayed", `Ever overstayed or breached visa conditions in ${country} or elsewhere?`, "select", YN),
    f("x_deported", "Ever been deported or removed from any country?", "select", YN),
    f("x_criminal", "Any criminal conviction or pending charge?", "select", YN),
    f("x_health", "Any serious medical condition (e.g. TB)?", "select", YN),
  ],
});

type Extra = { officialForm: string; officialUrl?: string; how: string[]; sections: (v: VisaTypeId) => FormSection[] };

const EXTRA: Record<string, Extra> = {
  AU: {
    officialForm: "Online application in ImmiAccount (e.g. Visitor subclass 600, Student subclass 500)",
    officialUrl: "https://online.immi.gov.au/",
    how: ["Create / sign in to ImmiAccount.", "Start a new application for your visa subclass.", "Copy the answers from this form into each ImmiAccount page.", "Attach your documents, pay the fee and submit.", "Book biometrics / health exam if asked."],
    sections: (v) => [{
      id: "x_au", title: "Australia specific", icon: "🇦🇺",
      fields: [
        f("x_auLocation", "Applying from (country)"),
        f("x_auPrevVisa", "Previous Australian visas (type, number, dates)", "textarea"),
        f("x_auStream", "Visa stream", "select", v === "visit" ? ["Tourist stream (apply outside Australia)", "Tourist stream (apply in Australia)", "Sponsored family stream", "Business visitor stream", "Approved destination status stream"] : ["Not applicable"]),
        ...(v === "student" ? [f("x_auCoe", "CoE number(s)"), f("x_auProviderCode", "Provider / CRICOS code"), f("x_auOshc", "OSHC provider & policy number"), f("x_auGs", "Genuine Student answers: why this course, provider and Australia", "textarea"), f("x_auWelfare", "Welfare arrangements (if under 18)", "textarea")] : []),
        ...(v === "visit" ? [f("x_auHealthIns", "Health insurance for the stay?", "select", YN), f("x_auFamilyNotTravelling", "Family members not travelling with you", "textarea")] : []),
        f("x_auHealthExam", "HAP ID (health examination), if any"),
      ],
    }],
  },
  GB: {
    officialForm: "Online application on GOV.UK + biometrics at a visa application centre",
    officialUrl: "https://www.gov.uk/browse/visas-immigration",
    how: ["Start the correct visa application on GOV.UK.", "Copy these answers into the online form.", "Pay the fee (and IHS if required).", "Book the VFS/TLS appointment and upload documents.", "Attend biometrics."],
    sections: (v) => [{
      id: "x_gb", title: "United Kingdom specific", icon: "🇬🇧",
      fields: [
        f("x_gbPrevUk", "Previous UK visits in the last 10 years (dates, purpose)", "textarea"),
        f("x_gbMonthlySpend", "Your total monthly spending"),
        f("x_gbTripSpend", "Amount you will spend on this trip"),
        f("x_gbNiNumber", "UK National Insurance number (if any)"),
        ...(v === "student" ? [f("x_gbCas", "CAS number"), f("x_gbAtas", "ATAS certificate needed?", "select", YN), f("x_gbTb", "TB test certificate date", "date")] : []),
        ...(v === "work" ? [f("x_gbCos", "Certificate of Sponsorship number"), f("x_gbSoc", "SOC occupation code"), f("x_gbSponsorLicence", "Sponsor licence number")] : []),
      ],
    }],
  },
  US: {
    officialForm: "DS-160 Online Nonimmigrant Visa Application",
    officialUrl: "https://ceac.state.gov/genniv/",
    how: ["Complete the DS-160 online and save the Application ID.", "Pay the MRV fee.", "Book the interview (and OFC biometrics).", "Bring the DS-160 confirmation and documents to the interview."],
    sections: (v) => [{
      id: "x_us", title: "United States (DS-160) specific", icon: "🇺🇸",
      fields: [
        f("x_usContact", "U.S. point of contact (name, address, phone)", "textarea"),
        f("x_usAddress", "Address where you will stay in the U.S.", "textarea"),
        f("x_usPrevTravel", "Previous U.S. travel (dates, length)", "textarea"),
        f("x_usPrevVisa", "Previous U.S. visa number / date", undefined),
        f("x_usSocial", "Social media identifiers used in last 5 years", "textarea"),
        f("x_usOtherEmails", "Other email addresses (last 5 years)"),
        ...(v === "student" ? [f("x_usSevis", "SEVIS ID (N00…)"), f("x_usSchoolCode", "School code on I-20")] : []),
        ...(v === "work" ? [f("x_usPetition", "Petition receipt number (I-797)")] : []),
      ],
    }],
  },
  CA: {
    officialForm: "IRCC online application (e.g. IMM 5257 visitor, study permit, work permit)",
    officialUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/account.html",
    how: ["Sign in to your IRCC secure account.", "Answer the questionnaire to get your document checklist.", "Copy these answers into the forms (IMM 5257, IMM 5707…).", "Upload documents, pay fees and biometrics fee, submit.", "Give biometrics when you receive the letter."],
    sections: (v) => [{
      id: "x_ca", title: "Canada specific", icon: "🇨🇦",
      fields: [
        f("x_caUci", "UCI / client number (if applied before)"),
        f("x_caFunds", "Funds available for your stay (CAD)"),
        f("x_caFamily", "Family members (spouse, children, parents, siblings): names, DOB, address (IMM 5707)", "textarea"),
        ...(v === "student" ? [f("x_caDli", "DLI number"), f("x_caLoaId", "Letter of acceptance ID"), f("x_caPal", "PAL number (province)"), f("x_caGic", "GIC certificate number")] : []),
        ...(v === "work" ? [f("x_caLmia", "LMIA number / offer of employment number")] : []),
      ],
    }],
  },
  NZ: {
    officialForm: "Online application on Immigration New Zealand",
    officialUrl: "https://www.immigration.govt.nz/",
    how: ["Create a RealMe login and start the application online.", "Copy these answers into the form, upload documents and pay."],
    sections: () => [{ id: "x_nz", title: "New Zealand specific", icon: "🇳🇿", fields: [f("x_nzPrev", "Previous NZ visas / visits", "textarea"), f("x_nzInsurance", "Medical & travel insurance arranged?", "select", YN)] }],
  },
  IE: {
    officialForm: "AVATS online application + summary form and documents",
    officialUrl: "https://www.visas.inis.gov.ie/avats/OnlineHome.aspx",
    how: ["Complete the AVATS form online and print the summary.", "Sign it and submit with documents to the embassy / visa office."],
    sections: () => [{ id: "x_ie", title: "Ireland specific", icon: "🇮🇪", fields: [f("x_iePrev", "Previous Irish visas / visits", "textarea"), f("x_ieUkVisa", "Do you hold a current UK visa?", "select", YN)] }],
  },
  JP: {
    officialForm: "Japanese visa application form (embassy / accredited agency)",
    officialUrl: "https://www.mofa.go.jp/j_info/visit/visa/index.html",
    how: ["Download the form from the Japanese embassy website.", "Fill it with these answers, attach a photo and sign.", "Submit through the embassy or an accredited agency."],
    sections: () => [{ id: "x_jp", title: "Japan specific", icon: "🇯🇵", fields: [f("x_jpGuarantor", "Guarantor / inviter in Japan (name, address, phone)", "textarea"), f("x_jpItinerary", "Day-by-day itinerary in Japan", "textarea")] }],
  },
};

const SCHENGEN_EXTRA: Extra = {
  officialForm: "Harmonised Schengen visa application form",
  how: ["Use the form/portal of the country of your main destination (e.g. France-Visas, VIDEX for Germany).", "Fill it with these answers, print and sign.", "Book the appointment at the embassy / VFS / TLS and attend biometrics."],
  sections: () => [{
    id: "x_schengen", title: "Schengen specific", icon: "🇪🇺",
    fields: [
      f("x_scSurnameBirth", "Surname at birth (former surnames)"),
      f("x_scMainState", "Member state of main destination"),
      f("x_scFirstEntry", "Member state of first entry"),
      f("x_scEntries", "Number of entries requested", "select", ["Single entry", "Two entries", "Multiple entries"]),
      f("x_scDays", "Intended duration of stay (days)", "number"),
      f("x_scFingerprints", "Fingerprints collected previously for a Schengen visa?", "select", YN),
      f("x_scFingerDate", "If yes, date", "date"),
      f("x_scPrevVisas", "Schengen visas issued in the past 3 years", "textarea"),
      f("x_scInviter", "Inviting person / hotel (name, address, phone)", "textarea"),
      f("x_scCostBy", "Cost of travelling and living covered by", "select", ["Applicant", "Sponsor / host", "Employer", "Both applicant and sponsor"]),
      f("x_scInsurance", "Travel medical insurance (company, policy no., cover €)"),
    ],
  }],
};

export function getCountryForm(countryCode: string, visaType: VisaTypeId): CountryForm {
  const code = countryCode.toUpperCase();
  const country = getCountry(code)?.name ?? code;
  const base = SCHENGEN.has(code) ? SCHENGEN_EXTRA : EXTRA[code];
  const profile = getCountryProfile(code);
  const mode = getApplyMode(code, visaType);
  const purposeSection: FormSection = { id: "x_purpose", title: `${visaTypeName(visaType)} details`, icon: "🎯", fields: COMMON_PURPOSE[visaType] ?? [] };
  const sections = [purposeSection, ...(base ? base.sections(visaType) : []), DECLARATIONS(country)].filter((s) => s.fields.length);
  return {
    title: `${country}: ${visaTypeName(visaType)} visa application`,
    officialForm: base?.officialForm ?? profile.formName ?? `${country} visa application form (from the official embassy / e-Visa website)`,
    officialUrl: base?.officialUrl ?? profile.portal?.url,
    howToSubmit: base?.how ?? [
      mode === "online" ? `Apply on the official ${country} e-Visa / immigration website.` : `Get the ${country} application form from the official embassy or e-Visa website.`,
      "Copy the answers from this form (or upload the official PDF in the “Fill an official PDF form” tab).",
      "Attach your documents, pay the fee and submit as instructed.",
    ],
    sections,
  };
}
